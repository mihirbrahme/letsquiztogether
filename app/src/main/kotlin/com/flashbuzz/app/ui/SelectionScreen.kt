package com.flashbuzz.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flashbuzz.app.ui.components.AnimatedBackground
import com.flashbuzz.app.ui.components.GlassCard
import com.flashbuzz.app.ui.theme.KahootPink

@Composable
fun RoleSelectionScreen(
    onSelectAdmin: () -> Unit,
    onSelectPlayer: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                "FlashBuzz",
                style = MaterialTheme.typography.displayLarge,
                color = Color.White
            )
            Text(
                "Digital Quiz Buzzer",
                style = MaterialTheme.typography.labelLarge,
                color = Color.White.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.height(64.dp))
            
            GlassCard(modifier = Modifier.fillMaxWidth(0.9f)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Button(
                        onClick = onSelectAdmin,
                        modifier = Modifier.fillMaxWidth().height(64.dp),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("HOST A QUIZ", fontWeight = FontWeight.Bold)
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = onSelectPlayer,
                        modifier = Modifier.fillMaxWidth().height(64.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = KahootPink),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Text("JOIN A QUIZ", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
