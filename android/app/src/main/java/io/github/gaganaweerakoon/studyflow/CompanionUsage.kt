package io.github.gaganaweerakoon.studyflow

import android.Manifest
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import kotlin.math.max
import kotlin.math.min

/**
 * Reads real, on-device foreground app usage after the user grants Android Usage Access.
 * No app-usage history is transmitted to the paired Windows PC.
 */
internal object CompanionUsage {
    fun isGranted(context: Context): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) ==
            AppOpsManager.MODE_ALLOWED
    }

    fun status(context: Context): JSONObject = JSONObject()
        .put("granted", isGranted(context))

    fun snapshot(context: Context, sessionStart: Long): JSONObject {
        if (!isGranted(context)) {
            return JSONObject().put("granted", false)
                .put("today", JSONArray()).put("session", JSONArray())
        }
        val now = System.currentTimeMillis()
        val todayStart = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
        val sessionSince = if (sessionStart > 0 && sessionStart <= now) sessionStart else now
        val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val records = mutableListOf<Triple<String, Long, Long>>()
        val active = mutableMapOf<String, Long>()
        val events = usage.queryEvents(todayStart, now)
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            if (pkg == context.packageName) continue
            when (event.eventType) {
                UsageEvents.Event.ACTIVITY_RESUMED -> active[pkg] = event.timeStamp
                UsageEvents.Event.ACTIVITY_PAUSED,
                UsageEvents.Event.ACTIVITY_STOPPED -> {
                    val start = active.remove(pkg) ?: continue
                    if (event.timeStamp > start) records.add(Triple(pkg, start, event.timeStamp))
                }
            }
        }
        active.forEach { (pkg, start) ->
            if (now > start) records.add(Triple(pkg, start, now))
        }

        fun aggregate(since: Long): JSONArray {
            val totals = mutableMapOf<String, Long>()
            for ((pkg, start, end) in records) {
                val duration = max(0, min(end, now) - max(start, since))
                if (duration > 0) totals[pkg] = (totals[pkg] ?: 0L) + duration
            }
            val result = JSONArray()
            totals.toList().sortedByDescending { it.second }.take(12).forEach { (pkg, ms) ->
                val name = runCatching {
                    val info = context.packageManager.getApplicationInfo(pkg, 0)
                    context.packageManager.getApplicationLabel(info).toString()
                }.getOrDefault(pkg.substringAfterLast('.'))
                result.put(JSONObject()
                    .put("id", pkg)
                    .put("name", name)
                    .put("minutes", (ms / 6000.0).toInt() / 10.0))
            }
            return result
        }
        return JSONObject()
            .put("granted", true)
            .put("today", aggregate(todayStart))
            .put("session", aggregate(sessionSince))
    }
}
