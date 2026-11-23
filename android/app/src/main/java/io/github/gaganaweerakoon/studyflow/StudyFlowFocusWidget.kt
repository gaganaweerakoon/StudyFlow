package io.github.gaganaweerakoon.studyflow

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max

/**
 * Native Android home-screen Focus widget.
 * The launcher chronometer keeps counting between live PC sync updates, without
 * exposing the pairing token to the home screen or running a background service.
 */
class StudyFlowFocusWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    companion object {
        private const val PREFS = "studyflow_widget"
        private const val SNAPSHOT_KEY = "last_focus_snapshot"

        fun storeAndUpdate(context: Context, raw: String) {
            if (raw.length > 8192) return
            val payload = runCatching { JSONObject(raw) }.getOrNull() ?: return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(SNAPSHOT_KEY, payload.toString()).apply()
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, StudyFlowFocusWidget::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, id: Int) {
            val view = RemoteViews(context.packageName, R.layout.widget_focus)
            val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(SNAPSHOT_KEY, null)
                ?.let { runCatching { JSONObject(it) }.getOrNull() }
            val focus = json?.optJSONObject("focus")
            val timer = focus?.optJSONObject("timer")
            val running = timer?.optBoolean("running", false) == true
            val phase = timer?.optString("phase") ?: "focus"
            val mode = timer?.optString("mode") ?: "Pomodoro"
            val session = timer?.optString("taskTitle").orEmpty().ifBlank { "Independent focus" }
            val total = max(1L, timer?.optLong("totalSeconds", 1500) ?: 1500)
            val at = focus?.optLong("at", 0L) ?: 0L
            val transmitted = json?.optLong("serverNowMs", 0L) ?: 0L
            val received = json?.optLong("receivedAtMs", System.currentTimeMillis()) ?: System.currentTimeMillis()
            val wallNow = System.currentTimeMillis()
            val estimatedPcNow = transmitted + max(0L, wallNow - received)
            val advanced = if (running && at > 0) max(0L, (estimatedPcNow - at) / 1000) else 0L
            val elapsed = max(0L, (timer?.optLong("elapsedSeconds", 0L) ?: 0L) + advanced)
            val left = max(0L, (timer?.optLong("secondsLeft", total) ?: total) - advanced)
            val stopwatch = mode == "Stopwatch"
            val phaseText = when {
                timer == null -> "Not connected"
                timer.optBoolean("completionModalOpen", false) -> "Completed"
                running && phase == "break" -> "Break"
                running -> "Focusing"
                elapsed > 0 -> "Paused"
                else -> "Ready"
            }

            view.setTextViewText(R.id.widget_title, "StudyFlow · Focus")
            view.setTextViewText(R.id.widget_phase, phaseText)
            view.setTextViewText(R.id.widget_session, if (timer == null) "Open StudyFlow to pair your PC" else session)
            val base = if (stopwatch) SystemClock.elapsedRealtime() - elapsed * 1000
                else SystemClock.elapsedRealtime() + left * 1000
            view.setChronometer(R.id.widget_timer, base, null, running)
            view.setChronometerCountDown(R.id.widget_timer, !stopwatch)
            val fraction = (if (stopwatch) elapsed else total - left).toDouble() / total
            view.setProgressBar(R.id.widget_progress, 1000,
                (fraction.coerceIn(0.0, 1.0) * 1000).toInt(), false)
            val pcName = json?.optString("pcName").orEmpty().ifBlank { "PC" }
            val updated = if (received > 0L) {
                SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(received))
            } else "never"
            view.setTextViewText(R.id.widget_sync, "$pcName · last sync $updated · tap to open")
            val open = Intent(context, MainActivity::class.java)
                .putExtra("studyflow_open_focus", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val pending = PendingIntent.getActivity(context, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            view.setOnClickPendingIntent(R.id.widget_root, pending)
            manager.updateAppWidget(id, view)
        }
    }
}
