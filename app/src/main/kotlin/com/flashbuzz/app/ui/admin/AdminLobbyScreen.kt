package com.flashbuzz.app.ui.admin

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.flashbuzz.app.ui.components.AnimatedBackground
import com.flashbuzz.app.ui.components.GlassCard
import com.flashbuzz.app.ui.theme.KahootBlue

@Composable
fun AdminLobbyScreen(
    roomCode: String,
    playerCount: Int,
    onStartQuiz: () -> Unit,
    onImportQuiz: (String) -> Unit
) {
    var sheetUrl by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            Text("Quiz Lobby", style = MaterialTheme.typography.headlineLarge, color = Color.White)
            Text("Waiting for challengers...", color = Color.White.copy(alpha = 0.7f))
            
            Spacer(modifier = Modifier.height(32.dp))
            
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.padding(8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("ROOM CODE", style = MaterialTheme.typography.labelSmall, color = Color.White)
                    Text(
                        roomCode,
                        style = MaterialTheme.typography.displayLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
            
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text("Joined Players", style = MaterialTheme.typography.titleMedium, color = Color.White)
                    Text(
                        "$playerCount players ready",
                        style = MaterialTheme.typography.bodyLarge,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    OutlinedTextField(
                        value = sheetUrl,
                        onValueChange = { sheetUrl = it },
                        label = { Text("Google Sheets Link", color = Color.White) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    
                    Button(
                        onClick = { onImportQuiz(sheetUrl) },
                        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KahootBlue)
                    ) {
                        Text("IMPORT QUESTIONS")
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = onStartQuiz,
                        modifier = Modifier.fillMaxWidth().height(60.dp),
                        enabled = playerCount >= 0, // Changed to 0 for dev testing
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Text("START GAME", fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
        }
    }
}
