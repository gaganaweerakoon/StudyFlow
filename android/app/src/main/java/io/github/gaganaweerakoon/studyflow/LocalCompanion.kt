package io.github.gaganaweerakoon.studyflow

import android.os.Build
import android.os.SystemClock
import android.util.Base64
import org.json.JSONObject
import java.io.DataInputStream
import java.io.DataOutputStream
import java.net.InetSocketAddress
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.Socket
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.security.MessageDigest
import java.security.cert.CertificateException
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLHandshakeException
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

internal object LocalCompanion {
    // Hotspot and Wi-Fi connections can take longer to establish than a local loopback test.
    // Keep the overall deadline bounded while allowing slower candidate interfaces to respond.
    private const val CONNECTION_DEADLINE_MS = 60_000L
    private const val TCP_CONNECT_TIMEOUT_MS = 25_000
    private const val OFF_SUBNET_CONNECT_TIMEOUT_MS = 1_500
    private const val TLS_HANDSHAKE_TIMEOUT_MS = 6_000
    private const val CALENDAR_RESPONSE_TIMEOUT_MS = 8_000
    private const val DISCOVERY_BUDGET_MS = 8_000L
    private const val DISCOVERY_PROBE_TIMEOUT_MS = 250
    private const val DISCOVERY_WORKERS = 24
    private fun localAddress(value: String): Boolean {
        val pieces = value.split('.').map { it.toIntOrNull() ?: return false }
        if (pieces.size != 4 || pieces.any { it !in 0..255 }) return false
        val (first, second) = pieces
        return first == 10 || first == 172 && second in 16..31 ||
            first == 192 && second == 168 || first == 169 && second == 254
    }

    private fun nearbyHosts(endpoint: JSONObject): List<String> {
        val hosts = endpoint.getJSONArray("hosts")
        val interfaces = runCatching {
            NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()
                .filter { it.isUp && !it.isLoopback }.flatMap { it.interfaceAddresses }
                .filter { it.address is Inet4Address && it.networkPrefixLength in 1..32 }
        }.getOrDefault(emptyList())
        fun ipv4(value: String) = value.split('.').fold(0) { ip, part -> (ip shl 8) or part.toInt() }
        fun matches(host: String) = interfaces.any {
            val shift = 32 - it.networkPrefixLength
            (ipv4(host) ushr shift) == (ipv4(it.address.hostAddress ?: "0.0.0.0") ushr shift)
        }
        return (0 until hosts.length()).map { hosts.getString(it) }
            .filter(::localAddress).distinct().sortedByDescending(::matches)
    }


    /**
     * Hotspot phones often cannot reach the address advertised by a PC's VPN or virtual adapter.
     * Look only on directly attached Wi-Fi/hotspot/Ethernet interfaces, not cellular or VPN.
     * Limit discovery to two local /24 ranges; the TLS certificate pin below is still mandatory.
     */
    private fun localLanCandidates(): List<String> {
        val interfaces = runCatching { NetworkInterface.getNetworkInterfaces()?.toList().orEmpty() }
            .getOrDefault(emptyList())
        val active = interfaces.filter { nic ->
            val name = nic.name.lowercase()
            runCatching { nic.isUp && !nic.isLoopback }.getOrDefault(false) &&
                listOf("wlan", "swlan", "ap", "softap", "eth", "rndis", "usb", "br", "tether")
                    .any(name::startsWith)
        }
        val addresses = active.flatMap { nic ->
            nic.interfaceAddresses.mapNotNull { entry ->
                val ip = entry.address
                val value = ip.hostAddress
                if (ip !is Inet4Address || value == null ||
                    !localAddress(value) || entry.networkPrefixLength !in 20..30
                ) null else value
            }
        }.distinct()
        val prefixes = addresses.map { it.substringBeforeLast('.') }.distinct().take(2)
        return prefixes.flatMap { prefix ->
            (1..254).map { "$prefix.$it" }
        }.filterNot(addresses::contains)
    }

    /** Only TCP-probe nearby addresses; never send pairing secrets until TLS pin verification. */
    private fun discoverListeners(excluded: Set<String>, deadline: Long): List<String> {
        val candidates = localLanCandidates().filterNot(excluded::contains)
        if (candidates.isEmpty()) return emptyList()
        val until = minOf(deadline, SystemClock.elapsedRealtime() + DISCOVERY_BUDGET_MS)
        val found = ConcurrentLinkedQueue<String>()
        val workers = Executors.newFixedThreadPool(DISCOVERY_WORKERS)
        try {
            for (host in candidates) {
                workers.execute {
                    val timeout = minOf(
                        DISCOVERY_PROBE_TIMEOUT_MS.toLong(),
                        until - SystemClock.elapsedRealtime()
                    ).toInt()
                    if (timeout <= 0 || Thread.currentThread().isInterrupted) return@execute
                    try {
                        Socket().use { it.connect(InetSocketAddress(host, 8475), timeout) }
                        found.add(host)
                    } catch (_: Exception) {
                        // An unreachable address is expected on a local subnet.
                    }
                }
            }
            workers.shutdown()
            val budget = (until - SystemClock.elapsedRealtime()).coerceAtLeast(0L)
            if (budget > 0) workers.awaitTermination(budget, TimeUnit.MILLISECONDS)
        } finally {
            workers.shutdownNow()
        }
        return found.distinct().take(8)
    }

    fun request(raw: String, token: String?, command: String? = null, sessionId: String? = null, record: String? = null): JSONObject {
        val endpoint = JSONObject(raw)
        val hosts = nearbyHosts(endpoint)
        val port = endpoint.getInt("port")
        val pin = Base64.decode(endpoint.getString("pin"), Base64.DEFAULT)
        val key = token ?: endpoint.getString("code")
        require(endpoint.getInt("v") == 1 && hosts.size in 1..12 && port == 8475 &&
            pin.size == 32 && key.matches(Regex("[0-9a-f]{64}"))) { "This is not a valid StudyFlow pairing code." }
        val manager = object : X509TrustManager {
            override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {
                throw CertificateException("Unexpected client certificate")
            }
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {
                val actual = chain.firstOrNull()?.let { MessageDigest.getInstance("SHA-256").digest(it.encoded) }
                if (actual == null || !MessageDigest.isEqual(pin, actual)) {
                    throw CertificateException("StudyFlow PC identity changed")
                }
            }
        }
        val context = SSLContext.getInstance("TLS").apply { init(null, arrayOf<TrustManager>(manager), null) }
        require(command == null || (token != null &&
            command in listOf("start", "pause", "resume", "reset", "complete", "offline_sync"))) {
            "Invalid focus command."
        }
        val request = JSONObject()
            .put("action", if (command != null) "focus_control" else if (token == null) "claim" else "sync")
            .put("key", key)
        if (command != null) {
            request.put("command", command)
            request.put("sessionId", sessionId?.take(128) ?: "")
            if (command == "offline_sync") request.put("record", JSONObject(requireNotNull(record)))
        }
        if (token == null) {
            request.put("phone", listOf(Build.MANUFACTURER, Build.MODEL).distinct().joinToString(" ").take(48))
            request.put("token", endpoint.optString("token"))
        }
        val bytes = request.toString().toByteArray(Charsets.UTF_8)
        val started = SystemClock.elapsedRealtime()
        val deadline = started + CONNECTION_DEADLINE_MS
        val attempts = mutableListOf<String>()
        fun remaining(limit: Int): Int = (deadline - SystemClock.elapsedRealtime()).coerceIn(1L, limit.toLong()).toInt()
        fun connectTo(host: String, discovered: Boolean, tcpTimeoutMs: Int = TCP_CONNECT_TIMEOUT_MS): JSONObject? {
            if (SystemClock.elapsedRealtime() >= deadline) return null
            var stage = "TCP"
            return try {
                Socket().use { transport ->
                    transport.connect(InetSocketAddress(host, port), remaining(tcpTimeoutMs))
                    transport.soTimeout = remaining(TLS_HANDSHAKE_TIMEOUT_MS)
                    (context.socketFactory.createSocket(transport, host, port, true) as SSLSocket).use { socket ->
                        stage = "TLS"
                        socket.soTimeout = remaining(TLS_HANDSHAKE_TIMEOUT_MS)
                        socket.startHandshake()
                        stage = "calendar"
                        socket.soTimeout = remaining(CALENDAR_RESPONSE_TIMEOUT_MS)
                        val output = DataOutputStream(socket.getOutputStream())
                        output.writeInt(bytes.size)
                        output.write(bytes)
                        output.flush()
                        val input = DataInputStream(socket.getInputStream())
                        val size = input.readInt()
                        require(size in 1..2_100_000) { "Invalid StudyFlow calendar response." }
                        val reply = ByteArray(size)
                        input.readFully(reply)
                        JSONObject(String(reply, Charsets.UTF_8)).also {
                            val source = if (discovered) "found on local hotspot/Wi-Fi" else "from PC QR code"
                            it.put("diagnostic", "$host:$port • $source • " +
                                "${if (it.has("error")) "PC rejected request" else "connected"} • " +
                                "${SystemClock.elapsedRealtime() - started} ms")
                        }
                    }
                }
            } catch (error: Exception) {
                val result = when (error) {
                    is ConnectException -> "refused"
                    is SocketTimeoutException -> "timed out"
                    is SSLHandshakeException -> "verification failed"
                    else -> "failed"
                }
                attempts.add("$host:$port $stage $result")
                null
            }
        }
        // A QR may advertise a VPN or virtual adapter. Do not spend 25 seconds waiting
        // for a host outside the phone's active Wi-Fi / hotspot subnet.
        // Save the longer timeout for plausible local hosts and discovered listeners.
        val localPrefixes = localLanCandidates().asSequence()
            .map { it.substringBeforeLast('.') }.toSet()
        for (host in hosts) {
            val localSubnet = host.substringBeforeLast('.') in localPrefixes
            val limit = if (localSubnet) TCP_CONNECT_TIMEOUT_MS else OFF_SUBNET_CONNECT_TIMEOUT_MS
            connectTo(host, false, limit)?.let { return it }
        }
        // The QR can contain a VPN/virtual-adapter address. Search local LAN as fallback.
        val discovered = discoverListeners(hosts.toSet(), deadline)
        for (host in discovered) {
            connectTo(host, true)?.let { return it }
        }
        if (discovered.isEmpty()) {
            attempts.add("No additional PC listener found on the phone's local Wi-Fi/hotspot subnet")
        }
        val error = when {
            attempts.any { it.contains("TLS verification") } -> "Could not verify this PC’s identity. Open StudyFlow on Windows and scan a fresh code."
            attempts.any { it.contains("calendar") } -> "The PC answered, but the calendar transfer failed. Tap Sync calendar or retry the pairing."
            attempts.any { it.contains("TCP refused") } -> "The PC address refused the connection. Open StudyFlow on Windows and run Test connection under Mobile companion."
            else -> "Could not reach the StudyFlow PC from this phone. The QR may advertise a VPN address, or Windows Firewall/hotspot isolation may block port 8475. Check your laptop Wi-Fi IPv4 address and allow StudyFlow TCP 8475 on private networks."
        }
        return JSONObject().put("error", error)
            .put("diagnostic", attempts.joinToString("\n") + "\nElapsed: ${SystemClock.elapsedRealtime() - started} ms")
    }
}
