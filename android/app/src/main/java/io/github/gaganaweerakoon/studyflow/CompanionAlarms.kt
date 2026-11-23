package io.github.gaganaweerakoon.studyflow

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

private const val ALERT = "io.github.gaganaweerakoon.studyflow.ALERT"
private const val QUIET_CHANNEL = "studyflow-reminders"
private const val ALARM_CHANNEL = "studyflow-alarms"

internal class CompanionAlarms(private val context: Context) {
    private val alarms = requireNotNull(context.getSystemService(AlarmManager::class.java))
    private val notifications = requireNotNull(context.getSystemService(NotificationManager::class.java))
    private val preferences = context.getSharedPreferences("companion-alerts", Context.MODE_PRIVATE)

    fun canScheduleExact() = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()
    fun canNotify() = notifications.areNotificationsEnabled() &&
        (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)

    private fun alertIntent(id: String) = Intent(context, CompanionAlarmReceiver::class.java)
        .setAction(ALERT)
        .setData(Uri.Builder().scheme("studyflow").authority("alarm").appendPath(id).build())

    private fun pending(id: String, flags: Int) = PendingIntent.getBroadcast(
        context, 0, alertIntent(id), flags or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun stored() = JSONArray(preferences.getString("alerts", "[]"))

    private fun cancel(entries: JSONArray) {
        for (index in 0 until entries.length()) {
            val id = entries.getJSONObject(index).getString("id")
            pending(id, PendingIntent.FLAG_NO_CREATE)?.let { alarms.cancel(it); it.cancel() }
        }
    }

    fun replace(entries: JSONArray): Int {
        require(entries.length() <= 1500) { "Too many scheduled alerts." }
        val ids = mutableSetOf<String>()
        for (index in 0 until entries.length()) {
            val alert = entries.getJSONObject(index)
            val id = alert.getString("id")
            require(id.isNotBlank() && id.length <= 256 && ids.add(id))
            require(alert.getString("title").length <= 300 && alert.getLong("time") > 0)
            alert.getBoolean("exact")
        }
        val previous = stored()
        check(preferences.edit().putString("alerts", entries.toString()).commit()) { "Could not save schedule." }
        cancel(previous)
        return schedule(entries)
    }

    fun restore() = schedule(stored())

    private fun schedule(entries: JSONArray): Int {
        var scheduled = 0
        for (index in 0 until entries.length()) {
            val entry = entries.getJSONObject(index)
            val time = entry.getLong("time")
            if (time <= System.currentTimeMillis()) continue
            val exact = entry.getBoolean("exact")
            if (exact && !canScheduleExact()) continue
            val id = entry.getString("id")
            val intent = pending(id, PendingIntent.FLAG_UPDATE_CURRENT) ?: continue
            try {
                if (exact) {
                    alarms.setAlarmClock(AlarmManager.AlarmClockInfo(time, openApp()), intent)
                } else {
                    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, intent)
                }
                scheduled++
            } catch (_: SecurityException) {
                intent.cancel()
            }
        }
        return scheduled
    }

    private fun openApp() = PendingIntent.getActivity(
        context, 0, Intent(context, MainActivity::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    fun notifyAlert(id: String) {
        if (!canNotify()) return
        val entries = stored()
        val alert = (0 until entries.length()).asSequence().map(entries::getJSONObject)
            .find { it.getString("id") == id } ?: return
        if (alert.getLong("time") > System.currentTimeMillis()) return
        val exact = alert.getBoolean("exact")
        val channelId = if (exact) ALARM_CHANNEL else QUIET_CHANNEL
        val channel = NotificationChannel(
            channelId, if (exact) "Study and wake-up alarms" else "Study reminders",
            if (exact) NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_DEFAULT,
        )
        if (exact) {
            channel.setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build(),
            )
        }
        notifications.createNotificationChannel(channel)
        val notification = Notification.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(alert.getString("title"))
            .setContentText("StudyFlow")
            .setCategory(if (exact) Notification.CATEGORY_ALARM else Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setContentIntent(openApp())
            .setAutoCancel(true)
            .build()
        notifications.notify(id, 1, notification)
    }
}

class CompanionAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarms = CompanionAlarms(context)
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED -> alarms.restore()
            ALERT -> intent.data?.lastPathSegment?.let(alarms::notifyAlert)
        }
    }
}

internal class AlarmBridge(private val activity: MainActivity) {
    private val alarms = CompanionAlarms(activity)

    @JavascriptInterface
    fun status() = JSONObject()
        .put("exact", alarms.canScheduleExact())
        .put("notifications", alarms.canNotify()).toString()

    @JavascriptInterface
    fun replace(json: String): Int {
        if (json.length > 400_000) return -1
        return try { alarms.replace(JSONArray(json)) } catch (_: Exception) { -1 }
    }

    @JavascriptInterface
    fun enableExact() {
        if (Build.VERSION.SDK_INT >= 31 && !alarms.canScheduleExact()) activity.runOnUiThread {
            activity.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + activity.packageName)))
        }
    }

    @JavascriptInterface
    fun enableNotifications() = activity.runOnUiThread {
        if (Build.VERSION.SDK_INT >= 33 &&
            activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
        } else {
            activity.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName))
        }
    }
}
