package com.flashbuzz.app.ui.player

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flashbuzz.app.models.GameState
import com.flashbuzz.app.ui.components.AnimatedBackground
import com.flashbuzz.app.ui.theme.KahootGreen
import com.flashbuzz.app.ui.theme.KahootPink

@Composable
fun PlayerBuzzerScreen(
    gameState: GameState,
    queuePosition: Int, // 0 if not in queue
    questionText: String,
    points: Int,
    onBuzz: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    
    val buzzerColor by animateColorAsState(
        targetValue = when {
            queuePosition > 0 -> KahootGreen // Green (Locked)
            gameState == GameState.QUESTION_OPEN -> KahootPink // Red (Active)
            else -> Color(0xFF9E9E9E) // Grey (Disabled)
        },
        label = "buzzerColor"
    )

    // Trigger haptic when buzzer opens
    LaunchedEffect(gameState) {
        if (gameState == GameState.QUESTION_OPEN) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }

    val labelText = when {
        queuePosition > 0 -> "Buzzed!\n#$queuePosition"
        gameState == GameState.QUESTION_OPEN -> "GO!"
        else -> "Stand By"
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = "Question",
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.7f)
            )
            Text(
                text = questionText,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Text(
                text = "$points PTS",
                style = MaterialTheme.typography.displaySmall,
                color = Color.White,
                fontWeight = FontWeight.Black
            )

            Spacer(modifier = Modifier.weight(1f))

            // Large Circular Buzzer with Pulse Animation placeholder
            Box(
                modifier = Modifier
                    .size(280.dp)
                    .clip(CircleShape)
                    .background(buzzerColor)
                    .clickable(enabled = gameState == GameState.QUESTION_OPEN && queuePosition == 0) {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onBuzz()
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = labelText,
                    color = Color.White,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Black,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.weight(1f))
            
            if (queuePosition > 0) {
                Text(
                    "Waiting for host...",
                    color = Color.White.copy(alpha = 0.8f),
                    style = MaterialTheme.typography.bodyLarge
                )
            }
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}
