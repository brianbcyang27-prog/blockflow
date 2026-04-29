import SwiftUI

struct SplashView: View {
    @Binding var isShowing: Bool
    @State private var logoScale: CGFloat = 0.3
    @State private var logoOpacity: CGFloat = 0
    @State private var titleOffset: CGFloat = 30
    @State private var titleOpacity: CGFloat = 0
    @State private var gradientRotation: Double = 0

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(.systemBackground),
                    Color(.systemGroupedBackground),
                    Color.pink.opacity(0.1)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            .rotationEffect(.degrees(gradientRotation))

            VStack(spacing: 24) {
                Spacer()

                Image(systemName: "heart.text.square.fill")
                    .font(.system(size: 100))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.pink, .red, .orange],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: .pink.opacity(0.5), radius: 20, x: 0, y: 10)
                    .scaleEffect(logoScale)
                    .opacity(logoOpacity)

                Text("BlockFlow")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [.primary, .secondary],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .offset(y: titleOffset)
                    .opacity(titleOpacity)

                Text("Your Health Journey")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .offset(y: titleOffset)
                    .opacity(titleOpacity)

                Spacer()

                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .pink))
                    .scaleEffect(1.2)
                    .padding(.bottom, 60)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                logoScale = 1.0
                logoOpacity = 1.0
            }

            withAnimation(.easeOut(duration: 0.6).delay(0.3)) {
                titleOffset = 0
                titleOpacity = 1.0
            }

            withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                gradientRotation = 360
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    isShowing = false
                }
            }
        }
    }
}

#Preview {
    SplashView(isShowing: .constant(true))
}