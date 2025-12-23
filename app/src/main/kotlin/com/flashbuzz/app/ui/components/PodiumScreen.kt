package com.flashbuzz.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.flashbuzz.app.models.Player
import com.flashbuzz.app.ui.theme.KahootBlue
import com.flashbuzz.app.ui.theme.KahootPink
import com.flashbuzz.app.ui.theme.KahootPurple
import kotlinx.coroutines.delay

@Composable
fun PodiumScreen(
    topPlayers: List<Player> // Assumed sorted by score
) {
    var visibleLevel by remember { mutableStateOf(0) }
    
    LaunchedEffect(Unit) {
        delay(1000)
        visibleLevel = 3 // Reveal 3rd
        delay(1500)
        visibleLevel = 2 // Reveal 2nd
        delay(1500)
        visibleLevel = 1 // Reveal 1st
    }

    Box(modifier = Modifier.fillMaxSize()) {
        AnimatedBackground(modifier = Modifier.fillMaxSize())
        
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Bottom
        ) {
            Text(
                "CHAMPIONS",
                style = MaterialTheme.typography.displayMedium,
                color = Color.White,
                fontWeight = FontWeight.Black
            )
            
            Spacer(modifier = Modifier.height(64.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth().height(400.dp),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.Center
            ) {
                // 2nd Place
                PodiumPillar(
                    player = topPlayers.getOrNull(1),
                    color = KahootBlue,
                    heightMultiplier = 0.7f,
                    isVisible = visibleLevel <= 2 && topPlayers.size >= 2,
                    rank = "2nd"
                )
                
                // 1st Place
                PodiumPillar(
                    player = topPlayers.getOrNull(0),
                    color = KahootPurple,
                    heightMultiplier = 1.0f,
                    isVisible = visibleLevel <= 1 && topPlayers.isNotEmpty(),
                    rank = "1st"
                )
                
                // 3rd Place
                PodiumPillar(
                    player = topPlayers.getOrNull(2),
                    color = KahootPink,
                    heightMultiplier = 0.5f,
                    isVisible = visibleLevel <= 3 && topPlayers.size >= 3,
                    rank = "3rd"
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Composable
fun PodiumPillar(
    player: Player?,
    color: Color,
    heightMultiplier: Float,
    isVisible: Boolean,
    rank: String
) {
    Column(
        modifier = Modifier
            .width(100.dp)
            .fillMaxHeight(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Bottom
    ) {
        AnimatedVisibility(
            visible = isVisible,
            enter = slideInVertically { it } + fadeIn()
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    player?.nickname ?: "---",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    "${player?.score ?: 0}",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
            }
        }
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(heightMultiplier * 0.8f)
                .background(color, MaterialTheme.shapes.medium),
            contentAlignment = Alignment.Center
        ) {
            Text(rank, color = Color.White, fontWeight = FontWeight.Black, fontSize = 24.sp)
        }
    }
}
