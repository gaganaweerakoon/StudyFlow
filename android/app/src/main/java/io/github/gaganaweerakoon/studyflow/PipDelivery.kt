package io.github.gaganaweerakoon.studyflow

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import java.net.URI
import javax.net.ssl.HttpsURLConnection
import org.json.JSONObject

private const val STORE = "pip_phone_delivery"
private const val JOB = 7401
private const val CHANNEL = "pip_check_ins"

private fun request(origin: String, path: String, credential: String?, body: JSONObject): JSONObject {
    val address = URI(origin)
    require(address.scheme == "https" && address.host != null && address.userInfo == null &&
        address.query == null && address.fragment == null && address.path.orEmpty() in listOf("", "/"))
    val connection = address.resolve(path).toURL().openConnection() as HttpsURLConnection
    try {
        connection.instanceFollowRedirects = false
        connection.connectTimeout = 8000
        connection.readTimeout = 8000
        connection.requestMethod = "POST"
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json")
        if (credential != null) connection.setRequestProperty("Authorization", "Bearer " + credential)
        connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
        require(connection.responseCode == 200)
        return connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
    } finally { connection.disconnect() }
}

object PipDeliverySettings {
    fun schedule(context: Context): Boolean {
        val scheduler = context.getSystemService(JobScheduler::class.java)
        val job = JobInfo.Builder(JOB, ComponentName(context, PipDeliveryJob::class.java))
            .setPeriodic(15 * 60_000L).setPersisted(true)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).build()
        return scheduler.schedule(job) == JobScheduler.RESULT_SUCCESS
    }

    fun show(activity: Activity) {
        val prefs = activity.getSharedPreferences(STORE, Context.MODE_PRIVATE)
        val scheduler = activity.getSystemService(JobScheduler::class.java)
        if (prefs.contains("token")) {
            AlertDialog.Builder(activity).setMessage("Turn off Pip check-ins on this phone?")
                .setNegativeButton("Keep enabled", null).setPositiveButton("Turn off") { _, _ ->
                    prefs.edit().clear().apply()
                    scheduler.cancel(JOB)
                }.show()
            return
        }
        val address = EditText(activity).apply { hint = "HTTPS relay address"; isSingleLine = true }
        val code = EditText(activity).apply { hint = "One-time pairing code"; isSingleLine = true }
        val form = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL; addView(address); addView(code) }
        AlertDialog.Builder(activity).setTitle("Pair Pip check-ins").setView(form)
            .setNegativeButton("Cancel", null).setPositiveButton("Pair") { _, _ ->
                val origin = address.text.toString().trim()
                val claim = code.text.toString().trim()
                Thread {
                    val success = runCatching {
                        require(claim.matches(Regex("[A-Za-z0-9_-]{43}")))
                        val token = request(origin, "/v1/claim", null, JSONObject().put("pairingCode", claim)).getString("phoneToken")
                        require(token.matches(Regex("[A-Za-z0-9_-]{43}")))
                        check(schedule(activity))
                        prefs.edit().putString("origin", origin).putString("token", token).apply()
                    }.isSuccess
                    activity.runOnUiThread {
                        Toast.makeText(activity, if (success) "Pip check-ins paired" else "Pairing failed. Check the relay and code.", Toast.LENGTH_LONG).show()
                        if (success && Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                            activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), JOB)
                    }
                }.start()
            }.show()
    }
}

class PipDeliveryJob : JobService() {
    @Volatile private var generation = 0
    private fun focusRunning(): Boolean {
        val snapshot = getSharedPreferences("studyflow_widget", MODE_PRIVATE).getString("presentation_v2", null) ?: return false
        return runCatching { JSONObject(snapshot).optJSONObject("focus")?.optBoolean("running") == true }.getOrDefault(false)
    }
    override fun onStartJob(params: JobParameters): Boolean {
        val run = ++generation
        val prefs = getSharedPreferences(STORE, MODE_PRIVATE)
        val token = prefs.getString("token", null) ?: return false
        val origin = prefs.getString("origin", null) ?: return false
        val manager = getSystemService(NotificationManager::class.java)
        if (!manager.areNotificationsEnabled() || focusRunning()) return false
        Thread {
            try {
                val item = request(origin, "/v1/pip", token, JSONObject()).optJSONObject("delivery")
                if (item != null && run == generation && prefs.getString("token", null) == token &&
                    !focusRunning() && System.currentTimeMillis() < item.getLong("expiresAt")) {
                    val detail = when (item.getString("kind")) {
                        "milestone" -> "You reached a study milestone. Pip has the details."
                        "session" -> "There’s a study session you can check with Pip."
                        "task" -> "Pip has a next step for this evening."
                        else -> return@Thread
                    }
                    manager.createNotificationChannel(NotificationChannel(CHANNEL, "Pip check-ins", NotificationManager.IMPORTANCE_DEFAULT))
                    val open = PendingIntent.getActivity(this, JOB, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
                    manager.notify(JOB, Notification.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
                        .setContentTitle("Pip").setContentText(detail).setContentIntent(open).setAutoCancel(true).build())
                }
            } catch (_: Exception) { /* The next scheduled poll can collect a still-fresh envelope. */ }
            finally { if (run == generation) jobFinished(params, false) }
        }.start()
        return true
    }
    override fun onStopJob(params: JobParameters): Boolean { generation++; return false }
}
