import SwiftUI

struct LoginView: View {
    @Binding var isLoggedIn: Bool
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var isAnimating = false

    private let impactGenerator = UIImpactFeedbackGenerator(style: .medium)

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(.systemBackground),
                    Color(.systemGroupedBackground)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 32) {
Spacer()

            VStack(spacing: 16) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.pink, .red],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .scaleEffect(isAnimating ? 1.0 : 0.5)
                        .opacity(isAnimating ? 1.0 : 0.0)

                    Text("BlockFlow")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Your Health, Your Blocks")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
.padding(.bottom, 32)

            VStack(spacing: 16) {
                HStack {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(.secondary)
                            .frame(width: 24)

                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
.shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)

                HStack {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.secondary)
                            .frame(width: 24)

                        SecureField("Password", text: $password)
                            .textContentType(.password)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
.shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)

                Button(action: login) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Login")
                                    .fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.pink, .red],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(email.isEmpty || password.isEmpty || isLoading)
.opacity(email.isEmpty || password.isEmpty ? 0.6 : 1.0)

                Button(action: continueAsGuest) {
                        Text("Continue as Guest")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 24)

Spacer()

            Text("By continuing, you agree to our Terms of Service")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
            }
        }
        .alert("Login Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                isAnimating = true
            }
        }
    }

    private func login() {
        impactGenerator.impactOccurred()
        isLoading = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            isLoading = false

            if email.contains("@") && password.count >= 4 {
                UserDefaults.standard.set(true, forKey: "isLoggedIn")
                UserDefaults.standard.set(email, forKey: "userEmail")
                withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
                    isLoggedIn = true
                }
            } else {
                errorMessage = "Please enter a valid email and password (min 4 characters)"
                showError = true
            }
        }
    }

    private func continueAsGuest() {
        impactGenerator.impactOccurred()
        UserDefaults.standard.set(false, forKey: "isLoggedIn")
        UserDefaults.standard.set("Guest", forKey: "userEmail")
        withAnimation(.spring(response: 0.5, dampingFraction: 0.7)) {
            isLoggedIn = true
        }
    }
}

#Preview {
    LoginView(isLoggedIn: .constant(false))
}