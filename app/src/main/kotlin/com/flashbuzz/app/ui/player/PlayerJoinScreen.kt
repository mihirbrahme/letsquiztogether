package com.flashbuzz.app.ui.player

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.flashbuzz.app.ui.components.AnimatedBackground
import com.flashbuzz.app.ui.components.GlassCard
import com.flashbuzz.app.ui.theme.KahootPink

@Composable
fun PlayerJoinScreen(
    onJoin: (String, String) -> Unit // Code, Nickname
) {
    var roomCode by remember { mutableStateOf("") }
    var nickname by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "Ready to Buzz?",
                style = MaterialTheme.typography.displayMedium,
                color = Color.White
            )
            Spacer(modifier = Modifier.height(32.dp))

            GlassCard(modifier = Modifier.fillMaxWidth(0.9f)) {
                Column {
                    OutlinedTextField(
                        value = roomCode,
                        onValueChange = { if (it.length <= 6) roomCode = it.uppercase() },
                        label = { Text("6-Digit Room Code", color = Color.White) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = nickname,
                        onValueChange = { nickname = it },
                        label = { Text("Your Nickname", color = Color.White) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    Button(
                        onClick = { onJoin(roomCode, nickname) },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        enabled = roomCode.length == 6 && nickname.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = KahootPink)
                    ) {
                        Text("GET STARTED")
                    }
                }
            }
        }
    }
}
