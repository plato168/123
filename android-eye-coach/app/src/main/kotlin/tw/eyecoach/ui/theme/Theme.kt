package tw.eyecoach.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Teal = Color(0xFF0F766E)
private val TealDark = Color(0xFF134E4A)
private val Cream = Color(0xFFF4F7F5)
private val Ink = Color(0xFF1F2933)
private val Danger = Color(0xFFB45309)
private val Bad = Color(0xFFDC2626)

private val Colors = lightColorScheme(
    primary = Teal,
    onPrimary = Color.White,
    secondary = TealDark,
    background = Cream,
    surface = Color.White,
    onBackground = Ink,
    onSurface = Ink,
    error = Bad,
    tertiary = Danger,
)

@Composable
fun EyeCoachTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = Colors,
        content = content,
    )
}
