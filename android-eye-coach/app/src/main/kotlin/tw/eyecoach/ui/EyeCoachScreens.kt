package tw.eyecoach.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.view.ViewGroup
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tw.eyecoach.analysis.DimensionAdvice
import tw.eyecoach.analysis.EnvironmentAnalyzer
import tw.eyecoach.analysis.Severity
import tw.eyecoach.camera.FaceFrameAnalyzer
import tw.eyecoach.session.SessionMode
import tw.eyecoach.session.SessionViewModel
import java.util.concurrent.Executors

@Composable
fun EyeCoachApp(viewModel: SessionViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Surface(modifier = Modifier.fillMaxSize()) {
        when (state.mode) {
            SessionMode.IDLE -> HomeScreen(
                onStartLive = viewModel::startLive,
                onStartDemo = viewModel::startDemo,
            )
            SessionMode.LIVE, SessionMode.DEMO -> SessionScreen(
                viewModel = viewModel,
            )
        }
    }
}

@Composable
private fun HomeScreen(
    onStartLive: () -> Unit,
    onStartDemo: (String) -> Unit,
) {
    val context = LocalContext.current
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted ->
        if (granted[Manifest.permission.CAMERA] == true) {
            onStartLive()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 28.dp),
    ) {
        Text("用眼環境教練", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(8.dp))
        Text(
            "開始一段閱讀或滑手機時，App 會估計距離、光線、低頭與連續時間，並告訴你要改善什麼、還差多少。",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.78f),
        )
        Spacer(Modifier.height(16.dp))
        PrivacyCard()
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = {
                val cameraOk = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.CAMERA,
                ) == PackageManager.PERMISSION_GRANTED
                val wantsNotification = Build.VERSION.SDK_INT >= 33
                val notifyOk = if (wantsNotification) {
                    ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) == PackageManager.PERMISSION_GRANTED
                } else {
                    true
                }
                if (cameraOk) {
                    onStartLive()
                } else {
                    val perms = mutableListOf(Manifest.permission.CAMERA)
                    if (wantsNotification && !notifyOk) {
                        perms += Manifest.permission.POST_NOTIFICATIONS
                    }
                    permissionLauncher.launch(perms.toTypedArray())
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text("開始守護（使用前鏡頭）", fontSize = 16.sp)
        }
        Spacer(Modifier.height(8.dp))
        Text(
            "鏡頭只在本段進行中開啟。系統不准 App 在背景偷拍，離開畫面就會停止偵測。",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
        )
        Spacer(Modifier.height(28.dp))
        Text("先看示範（不開鏡頭）", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        EnvironmentAnalyzer.demoScenarios.forEach { scenario ->
            Card(
                onClick = { onStartDemo(scenario.id) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(scenario.title, fontWeight = FontWeight.SemiBold)
                    Text(
                        scenario.subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                    )
                }
            }
        }
    }
}

@Composable
private fun PrivacyCard() {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE7F1EE)),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("隱私", fontWeight = FontWeight.SemiBold)
            Text("• 影像只在手機裡計算距離與角度，不算完即丟，不存檔、不上雲。")
            Text("• 這不是醫療診斷，只是用眼衛生提醒。")
            Text("• 距離為粗估，可用「校正距離」讓數字更接近你的實際狀況。")
        }
    }
}

@Composable
private fun SessionScreen(viewModel: SessionViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val report = state.report

    Column(
        modifier = Modifier
            .fillMaxSize()
            .systemBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    if (state.mode == SessionMode.DEMO) "示範模式" else "守護進行中",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleLarge,
                )
                Text("已進行 ${report?.elapsedLabel ?: "0:00"}")
            }
            if (state.mode == SessionMode.LIVE) {
                IconButton(onClick = viewModel::togglePreview) {
                    Icon(
                        if (state.showPreview) Icons.Outlined.Visibility else Icons.Outlined.VisibilityOff,
                        contentDescription = "切換預覽",
                    )
                }
            }
            TextButton(onClick = viewModel::stopSession) { Text("結束") }
        }

        if (state.mode == SessionMode.LIVE && state.cameraEnabled) {
            Spacer(Modifier.height(8.dp))
            FacePreview(
                calibrationScale = state.calibrationScale,
                onMetrics = viewModel::onFaceMetrics,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (state.showPreview) 180.dp else 1.dp)
                    .clip(RoundedCornerShape(16.dp)),
            )
        }

        Spacer(Modifier.height(12.dp))
        ScoreHeader(score = report?.overallScore ?: 0, grade = report?.overallGrade ?: "計算中", headline = report?.headline ?: "正在收集環境資料…")

        state.reminder?.let {
            Spacer(Modifier.height(10.dp))
            ReminderBanner(it)
        }
        state.fiveMinuteReview?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
        }

        Spacer(Modifier.height(12.dp))
        report?.dimensions.orEmpty().forEach { item ->
            DimensionCard(item)
            Spacer(Modifier.height(8.dp))
        }

        if (state.mode == SessionMode.LIVE && state.lastFace.detected) {
            FilledTonalButton(onClick = { viewModel.calibrateToCm(40f) }) {
                Text("我現在大約一臂遠（校正為 40 公分）")
            }
        }

        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = viewModel::stopSession,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
        ) {
            Text("結束本段並返回")
        }
        Spacer(Modifier.height(20.dp))
    }
}

@Composable
private fun ScoreHeader(score: Int, grade: String, headline: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(20.dp),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(CircleShape)
                    .background(scoreColor(score).copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$score", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = scoreColor(score))
                    Text(grade, fontSize = 12.sp, color = scoreColor(score))
                }
            }
            Spacer(Modifier.width(16.dp))
            Text(headline, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun ReminderBanner(text: String) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF4E5)),
        shape = RoundedCornerShape(14.dp),
    ) {
        Text(text, modifier = Modifier.padding(14.dp), fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun DimensionCard(item: DimensionAdvice) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(item.title, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                SeverityChip(item.severity)
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { item.score / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(8.dp)),
                color = severityColor(item.severity),
                trackColor = Color(0xFFE5E7EB),
            )
            Spacer(Modifier.height(8.dp))
            Text("現況：${item.currentLabel}")
            Text("目標：${item.targetLabel}")
            Text("還差多少：${item.gapLabel}", fontWeight = FontWeight.SemiBold, color = severityColor(item.severity))
            Text("怎麼改：${item.howTo}", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun SeverityChip(severity: Severity) {
    val (label, color) = when (severity) {
        Severity.GOOD -> "良好" to Color(0xFF047857)
        Severity.WARN -> "需調整" to Color(0xFFB45309)
        Severity.BAD -> "需改善" to Color(0xFFDC2626)
        Severity.UNKNOWN -> "無法判斷" to Color(0xFF6B7280)
    }
    Text(
        label,
        color = color,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

@Composable
private fun FacePreview(
    calibrationScale: Float,
    onMetrics: (tw.eyecoach.camera.FaceMetrics) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val executor = remember { Executors.newSingleThreadExecutor() }
    val analyzer = remember { FaceFrameAnalyzer(onMetrics) }
    analyzer.calibrationScale = calibrationScale

    DisposableEffect(lifecycleOwner) {
        onDispose {
            val provider = ProcessCameraProvider.getInstance(context)
            provider.addListener(
                { provider.get().unbindAll() },
                ContextCompat.getMainExecutor(context),
            )
            analyzer.close()
            executor.shutdown()
        }
    }

    AndroidView(
        modifier = modifier.background(Color.Black),
        factory = { ctx ->
            PreviewView(ctx).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                scaleType = PreviewView.ScaleType.FILL_CENTER
                implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener(
                    {
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(surfaceProvider)
                        }
                        val analysis = ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                            .also { it.setAnalyzer(executor, analyzer) }
                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_FRONT_CAMERA,
                                preview,
                                analysis,
                            )
                        } catch (_: Exception) {
                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    analysis,
                                )
                            } catch (_: Exception) {
                                // 模擬器可能沒有鏡頭，請改用首頁示範模式。
                            }
                        }
                    },
                    ContextCompat.getMainExecutor(ctx),
                )
            }
        },
    )
}

private fun scoreColor(score: Int): Color = when {
    score >= 80 -> Color(0xFF047857)
    score >= 60 -> Color(0xFFB45309)
    else -> Color(0xFFDC2626)
}

private fun severityColor(severity: Severity): Color = when (severity) {
    Severity.GOOD -> Color(0xFF047857)
    Severity.WARN -> Color(0xFFB45309)
    Severity.BAD -> Color(0xFFDC2626)
    Severity.UNKNOWN -> Color(0xFF6B7280)
}
