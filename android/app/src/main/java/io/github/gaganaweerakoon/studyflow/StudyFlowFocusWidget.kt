package io.github.gaganaweerakoon.studyflow

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max

class StudyFlowFocusWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        refresh(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == REFRESH) refresh(context)
    }

    companion object {
        private const val PREFS = "studyflow_widget"
        private const val KEY = "presentation_v2"
        private const val REFRESH = "io.github.gaganaweerakoon.studyflow.REFRESH_STATUS"
        private const val CHANNEL = "studyflow_current_status"
        private const val STATUS_ID = 7301

        private data class Event(val title: String, val start: Long, val end: Long)
        private data class Palette(val background: Int, val primary: Int, val muted: Int)
        private fun palette(theme: String): Palette = when (theme) {
            "dark" -> Palette(R.drawable.widget_focus_background, 0xfff5f5f8.toInt(), 0xffc3c3cf.toInt())
            "midnight" -> Palette(R.drawable.widget_midnight, 0xfff5f5ff.toInt(), 0xffbdbed5.toInt())
            "ocean" -> Palette(R.drawable.widget_ocean, 0xffeaf9ff.toInt(), 0xffb4d5e4.toInt())
            "forest" -> Palette(R.drawable.widget_forest, 0xffeffff3.toInt(), 0xffc4ddc8.toInt())
            "warm" -> Palette(R.drawable.widget_warm, 0xff39291e.toInt(), 0xff715b49.toInt())
            else -> Palette(R.drawable.widget_light, 0xff202332.toInt(), 0xff5b6071.toInt())
        }

        fun storeAndUpdate(context: Context, raw: String) {
            if (raw.length > 16384) return
            val payload = runCatching { JSONObject(raw) }.getOrNull() ?: return
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, payload.toString()).apply()
            refresh(context)
        }

        private fun open(context: Context, id: Int, focus: Boolean): PendingIntent {
            val intent = Intent(context, MainActivity::class.java)
                .putExtra("studyflow_open_focus", focus)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            return PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun time(value: Long): String = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(value))

        private fun refresh(context: Context) {
            val json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
                ?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
            val now = System.currentTimeMillis()
            val focus = json.optJSONObject("focus") ?: JSONObject()
            val running = focus.optBoolean("running")
            val stopwatch = focus.optBoolean("stopwatch")
            val phase = focus.optString("phase")
            val total = max(1L, focus.optLong("total", 1500))
            val updatedAt = json.optLong("updatedAt", now)
            val advance = if (running) max(0L, (now - updatedAt) / 1000) else 0L
            val seconds = max(0L, focus.optLong("seconds", total) + if (stopwatch) advance else -advance)
            val active = phase in listOf("focus", "break", "paused", "break_paused") && (stopwatch || seconds > 0)
            val events = json.optJSONArray("events")
            val rows = (0 until (events?.length() ?: 0)).mapNotNull { i ->
                events?.optJSONObject(i)?.let { Event(it.optString("title"), it.optLong("start"), it.optLong("end")) }
            }.filter { it.end > now }.sortedBy { it.start }
            val current = rows.firstOrNull { it.start <= now }
            val upcoming = rows.filter { it.start > now }.take(2)
            val title = when {
                active -> focus.optString("title").ifBlank { "Focus session" }
                current != null -> current.title
                else -> "Ready to study"
            }
            val status = when {
                active && phase == "break" -> "Break"
                active && !running -> "Paused"
                active -> "Focusing"
                current != null -> "In progress"
                else -> "StudyFlow"
            }
            val colors = palette(json.optString("theme"))
            val accent = runCatching { Color.parseColor(json.optString("accent", "#4F46E5")) }.getOrDefault(0xff4f46e5.toInt())
            val sync = json.optString("syncLabel")
            val syncText = if (sync.isBlank() || sync == "Not synced") "↻ —" else "↻ " + sync.replace(Regex(":\\d{2}(?=\\s|$)"), "")
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, StudyFlowFocusWidget::class.java))
            ids.forEach { id ->
                val view = RemoteViews(context.packageName, R.layout.widget_focus)
                view.setInt(R.id.widget_root, "setBackgroundResource", colors.background)
                for (res in listOf(R.id.widget_title, R.id.widget_session, R.id.widget_timer, R.id.widget_next, R.id.widget_next2)) view.setTextColor(res, colors.primary)
                for (res in listOf(R.id.widget_sync, R.id.widget_upcoming_label)) view.setTextColor(res, colors.muted)
                view.setTextColor(R.id.widget_phase, accent)
                view.setTextViewText(R.id.widget_title, "StudyFlow")
                view.setTextViewText(R.id.widget_phase, status)
                view.setTextViewText(R.id.widget_session, title)
                view.setTextViewText(R.id.widget_sync, syncText)
                view.setViewVisibility(R.id.widget_timer, if (active) View.VISIBLE else View.GONE)
                view.setViewVisibility(R.id.widget_progress, if (active) View.VISIBLE else View.GONE)
                val base = SystemClock.elapsedRealtime() + if (stopwatch) -seconds * 1000 else seconds * 1000
                view.setChronometer(R.id.widget_timer, base, null, running && active)
                view.setChronometerCountDown(R.id.widget_timer, !stopwatch)
                val fraction = (if (stopwatch) seconds else total - seconds).toDouble() / total
                view.setProgressBar(R.id.widget_progress, 1000, (fraction.coerceIn(0.0, 1.0) * 1000).toInt(), false)
                view.setTextViewText(R.id.widget_next, upcoming.getOrNull(0)?.let { time(it.start) + "   " + it.title } ?: "No upcoming study sessions")
                view.setTextViewText(R.id.widget_next2, upcoming.getOrNull(1)?.let { time(it.start) + "   " + it.title }.orEmpty())
                view.setViewVisibility(R.id.widget_next2, if (upcoming.size > 1) View.VISIBLE else View.GONE)
                view.setOnClickPendingIntent(R.id.widget_root, open(context, id, active))
                manager.updateAppWidget(id, view)
            }
            updateNotification(context, active, running, stopwatch, seconds, title, status, current, upcoming.firstOrNull())
            val boundaries = mutableListOf<Long>()
            if (running && active && !stopwatch) boundaries.add(now + seconds * 1000 + 1000)
            current?.let { boundaries.add(it.end) }
            upcoming.firstOrNull()?.let { boundaries.add(it.start) }
            val alarm = context.getSystemService(AlarmManager::class.java)
            val refresh = PendingIntent.getBroadcast(context, STATUS_ID, Intent(context, StudyFlowFocusWidget::class.java).setAction(REFRESH),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            alarm.cancel(refresh)
            boundaries.filter { it > now }.minOrNull()?.let { alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, it, refresh) }
        }

        private fun updateNotification(context: Context, active: Boolean, running: Boolean, stopwatch: Boolean,
            seconds: Long, title: String, status: String, current: Event?, next: Event?) {
            val manager = context.getSystemService(NotificationManager::class.java)
            if (!active && current == null && next == null) { manager.cancel(STATUS_ID); return }
            if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
            manager.createNotificationChannel(NotificationChannel(CHANNEL, "StudyFlow live status", NotificationManager.IMPORTANCE_LOW))
            val heading = if (active) title else current?.title ?: next!!.title
            val detail = when {
                active -> status
                current != null -> "Current session · until " + time(current.end)
                else -> "Upcoming · " + time(next!!.start)
            }
            val builder = Notification.Builder(context, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(heading).setContentText(detail)
                .setContentIntent(open(context, STATUS_ID, active))
                .setOnlyAlertOnce(true).setOngoing(active || current != null)
                .setVisibility(Notification.VISIBILITY_PUBLIC).setShowWhen(false)
            if (active && running) {
                builder.setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(!stopwatch)
                    .setWhen(System.currentTimeMillis() + if (stopwatch) -seconds * 1000 else seconds * 1000)
            }
            manager.notify(STATUS_ID, builder.build())
        }
    }
}
