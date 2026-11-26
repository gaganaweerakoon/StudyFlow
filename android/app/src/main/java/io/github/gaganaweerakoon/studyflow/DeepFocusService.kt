package io.github.gaganaweerakoon.studyflow

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.TextView
import org.json.JSONObject

/** Optional, local-only foreground app warning. No screen content access. */
class DeepFocusService : AccessibilityService() {
    private val handler = Handler(Looper.getMainLooper())
    private var overlay: TextView? = null
    private var previousPackage = ""
    private var lastWarning = 0L
    private val remove = Runnable { clearWarning() }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val app = event.packageName?.toString() ?: return
        if (app == previousPackage) return
        previousPackage = app
        if (app == packageName || app == "com.android.systemui" || app == "android") {
            clearWarning()
            return
        }
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            .resolveActivity(packageManager)?.packageName
        if (app == launcher) return
        val snapshot = getSharedPreferences("studyflow_widget", MODE_PRIVATE)
            .getString("presentation_v2", null)
            ?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
        if (!snapshot.optBoolean("deepFocus")) return
        val focus = snapshot.optJSONObject("focus") ?: return
        if (!focus.optBoolean("running") || focus.optString("phase") != "focus") return
        val now = System.currentTimeMillis()
        if (!focus.optBoolean("stopwatch") && !focus.optBoolean("overtimeEnabled") &&
            now >= snapshot.optLong("updatedAt", 0L) + focus.optLong("seconds", 0L) * 1000L) return
        if (now - lastWarning < 2500L) return
        lastWarning = now
        clearWarning()
        val text = TextView(this).apply {
            this.text = "Deep focus is active. Return to StudyFlow when you're ready."
            setTextColor(Color.WHITE)
            textSize = 15f
            setPadding(36, 24, 36, 24)
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                setColor(0xee202035.toInt())
                cornerRadius = 28f
            }
        }
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP; y = 100; title = "StudyFlow focus reminder" }
        runCatching {
            getSystemService(WindowManager::class.java).addView(text, params)
            overlay = text
            handler.postDelayed(remove, 3000)
        }
    }

    private fun clearWarning() {
        handler.removeCallbacks(remove)
        overlay?.let { runCatching { getSystemService(WindowManager::class.java).removeView(it) } }
        overlay = null
    }
    override fun onInterrupt() { clearWarning() }
    override fun onDestroy() { clearWarning(); super.onDestroy() }
}
