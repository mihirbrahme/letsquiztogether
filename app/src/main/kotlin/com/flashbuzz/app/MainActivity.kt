package com.flashbuzz.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import com.flashbuzz.app.models.GameState
import com.flashbuzz.app.models.Player
import com.flashbuzz.app.models.Question
import com.flashbuzz.app.ui.RoleSelectionScreen
import com.flashbuzz.app.ui.admin.AdminControlScreen
import com.flashbuzz.app.ui.admin.AdminLobbyScreen
import com.flashbuzz.app.ui.components.PodiumScreen
import com.flashbuzz.app.ui.player.PlayerBuzzerScreen
import com.flashbuzz.app.ui.player.PlayerJoinScreen
import com.flashbuzz.app.ui.theme.FlashBuzzTheme

enum class Screen {
    SELECTION,
    ADMIN_LOBBY,
    ADMIN_CONTROL,
    PLAYER_JOIN,
    PLAYER_BUZZER,
    PODIUM
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var currentScreen by remember { mutableStateOf(Screen.SELECTION) }
            var roomCode by remember { mutableStateOf("BUZZ99") }
            
            FlashBuzzTheme {
                when (currentScreen) {
                    Screen.SELECTION -> RoleSelectionScreen(
                        onSelectAdmin = { currentScreen = Screen.ADMIN_LOBBY },
                        onSelectPlayer = { currentScreen = Screen.PLAYER_JOIN }
                    )
                    Screen.ADMIN_LOBBY -> AdminLobbyScreen(
                        roomCode = roomCode,
                        playerCount = 3,
                        onStartQuiz = { currentScreen = Screen.ADMIN_CONTROL },
                        onImportQuiz = { /* Parse logic */ }
                    )
                    Screen.ADMIN_CONTROL -> AdminControlScreen(
                        currentQuestion = Question("What is the capital of Japan?", 15),
                        buzzerQueue = listOf("Alice", "Bob"),
                        onNextQuestion = { /* End for demo */ currentScreen = Screen.PODIUM },
                        onOpenBuzzer = { /* Logic */ },
                        onVerifyAnswer = { _, _ -> /* Logic */ }
                    )
                    Screen.PLAYER_JOIN -> PlayerJoinScreen(
                        onJoin = { code, _ -> 
                            roomCode = code
                            currentScreen = Screen.PLAYER_BUZZER 
                        }
                    )
                    Screen.PLAYER_BUZZER -> PlayerBuzzerScreen(
                        gameState = GameState.QUESTION_OPEN,
                        queuePosition = 0,
                        questionText = "What is the capital of Japan?",
                        points = 15,
                        onBuzz = { /* Logic */ }
                    )
                    Screen.PODIUM -> PodiumScreen(
                        topPlayers = listOf(
                            Player(id = "1", nickname = "Alice", score = 120),
                            Player(id = "2", nickname = "Bob", score = 90),
                            Player(id = "3", nickname = "Charlie", score = 80)
                        )
                    )
                }
            }
        }
    }
}
