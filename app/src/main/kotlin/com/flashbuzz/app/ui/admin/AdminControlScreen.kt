package com.flashbuzz.app.ui.admin

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashbuzz.app.models.Question
import com.flashbuzz.app.ui.components.AnimatedBackground
import com.flashbuzz.app.ui.components.GlassCard
import com.flashbuzz.app.ui.theme.KahootBlue
import com.flashbuzz.app.ui.theme.KahootGreen
import com.flashbuzz.app.ui.theme.KahootPink

@Composable
fun AdminControlScreen(
    currentQuestion: Question?,
    buzzerQueue: List<String>,
    onNextQuestion: () -> Unit,
    onOpenBuzzer: () -> Unit,
    onVerifyAnswer: (String, Boolean) -> Unit // PlayerID, isCorrect
) {
    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
        ) {
            Text("Host Dashboard", style = MaterialTheme.typography.headlineMedium, color = Color.White)
            
            Spacer(modifier = Modifier.height(24.dp))
            
            if (currentQuestion != null) {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text("ACTIVE QUESTION", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.7f))
                        Text(currentQuestion.text, style = MaterialTheme.typography.titleLarge, color = Color.White)
                        Text("${currentQuestion.points} POINTS", fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = onOpenBuzzer,
                    modifier = Modifier.weight(1f).height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KahootPink)
                ) {
                    Text("OPEN BUZZER", fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onNextQuestion,
                    modifier = Modifier.weight(1f).height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KahootBlue)
                ) {
                    Text("NEXT", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            
            Text("Live Queue", style = MaterialTheme.typography.titleMedium, color = Color.White)
            
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                itemsIndexed(buzzerQueue) { index, playerId ->
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "#${index + 1}",
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                                modifier = Modifier.padding(end = 16.dp)
                            )
                            Text(playerId, style = MaterialTheme.typography.titleMedium, color = Color.White, modifier = Modifier.weight(1f))
                            
                            IconButton(onClick = { onVerifyAnswer(playerId, true) }) {
                                Text("✅", fontSize = 20.sp)
                            }
                            IconButton(onClick = { onVerifyAnswer(playerId, false) }) {
                                Text("❌", fontSize = 20.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}
