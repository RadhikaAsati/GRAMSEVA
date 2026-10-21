import 'package:flutter/material.dart';

import 'services/api_service.dart';

void main() {
  runApp(const GramSevaApp());
}

const green = Color(0xFF18794E);
const paleGreen = Color(0xFFE1F3E7);
const ink = Color(0xFF24352B);
const muted = Color(0xFF718076);

class GramSevaApp extends StatelessWidget {
  const GramSevaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GRAMSEVA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: green),
        scaffoldBackgroundColor: const Color(0xFFF7F9F6),
        fontFamily: 'Roboto',
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 17,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFDCE5DD)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFDCE5DD)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: green, width: 1.5),
          ),
        ),
      ),
      home: const WelcomeScreen(),
    );
  }
}

// ------------------------------------------------------------
// WELCOME SCREEN
// ------------------------------------------------------------

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(26),
            child: Column(
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: paleGreen,
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: const Icon(
                    Icons.account_balance,
                    color: green,
                    size: 56,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'GRAMSEVA',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                    color: green,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Your voice. Your village. Better services.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: muted),
                ),
                const SizedBox(height: 32),
                const FeatureRow(
                  icon: Icons.record_voice_over,
                  title: 'Report a problem',
                  subtitle: 'Share issues through text or voice.',
                ),
                const SizedBox(height: 20),
                const FeatureRow(
                  icon: Icons.track_changes,
                  title: 'Track resolution',
                  subtitle: 'Follow your complaint’s progress.',
                ),
                const SizedBox(height: 20),
                const FeatureRow(
                  icon: Icons.verified_outlined,
                  title: 'Verify the outcome',
                  subtitle: 'Tell us whether the issue was solved.',
                ),
                const SizedBox(height: 34),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: FilledButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LoginScreen()),
                      );
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'Get Started',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Building accountable rural governance, together.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: muted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class FeatureRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const FeatureRow({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: paleGreen,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: green, size: 26),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: ink,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 13, color: muted),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ------------------------------------------------------------
// LOGIN SCREEN
// ------------------------------------------------------------

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);

    try {
      final user = await ApiService.login(
        email: _emailController.text,
        password: _passwordController.text,
      );

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => CitizenDashboard(
            initialName: user['full_name']?.toString() ?? 'Citizen',
          ),
        ),
        (route) => false,
      );
    } on ApiException catch (error) {
      _showMessage(error.message);
    } catch (_) {
      _showMessage('Something went wrong. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Welcome back'),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(26, 16, 26, 30),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        color: paleGreen,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: const Icon(
                        Icons.account_balance,
                        color: green,
                        size: 42,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Sign in to GRAMSEVA',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 25,
                      fontWeight: FontWeight.bold,
                      color: ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Access your community services and complaints.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: muted, fontSize: 14),
                  ),
                  const SizedBox(height: 28),

                  // Google OAuth will be connected separately.
                  OutlinedButton(
                    onPressed: _isLoading
                        ? null
                        : () {
                            _showMessage(
                              'Google sign-in is not connected yet.',
                            );
                          },
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(54),
                      backgroundColor: Colors.white,
                      foregroundColor: ink,
                      side: const BorderSide(color: Color(0xFFDCE5DD)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.g_mobiledata, size: 30),
                        SizedBox(width: 8),
                        Text(
                          'Continue with Google',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Row(
                    children: [
                      Expanded(child: Divider()),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 14),
                        child: Text('OR', style: TextStyle(color: muted)),
                      ),
                      Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Email address',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _emailController,
                    enabled: !_isLoading,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      hintText: 'you@example.com',
                      prefixIcon: Icon(Icons.email_outlined),
                    ),
                    validator: (value) {
                      final email = value?.trim() ?? '';

                      if (email.isEmpty) {
                        return 'Enter your email address';
                      }

                      if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                          .hasMatch(email)) {
                        return 'Enter a valid email address';
                      }

                      return null;
                    },
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'Password',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passwordController,
                    enabled: !_isLoading,
                    obscureText: _obscurePassword,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      hintText: 'Enter your password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Enter your password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 26),
                  SizedBox(
                    height: 54,
                    child: FilledButton(
                      onPressed: _isLoading ? null : _login,
                      style: FilledButton.styleFrom(
                        backgroundColor: green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Login',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Center(
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        const Text(
                          "Don't have an account? ",
                          style: TextStyle(color: muted),
                        ),
                        TextButton(
                          onPressed: _isLoading
                              ? null
                              : () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => const RegisterScreen(),
                                    ),
                                  );
                                },
                          child: const Text(
                            'Create account',
                            style: TextStyle(
                              color: green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------
// CITIZEN REGISTRATION SCREEN
// ------------------------------------------------------------

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;

  void _showMessage(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);

    try {
      final user = await ApiService.register(
        fullName: _nameController.text,
        email: _emailController.text,
        password: _passwordController.text,
        phone: _phoneController.text.trim().isEmpty
            ? null
            : _phoneController.text.trim(),
      );

      if (!mounted) return;

      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(
          builder: (_) => CitizenDashboard(
            initialName: user['full_name']?.toString() ?? 'Citizen',
          ),
        ),
        (route) => false,
      );
    } on ApiException catch (error) {
      _showMessage(error.message);
    } catch (_) {
      _showMessage('Something went wrong. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('Create account'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(26),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Join GRAMSEVA',
                  style: TextStyle(
                    fontSize: 27,
                    fontWeight: FontWeight.bold,
                    color: ink,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Create a citizen account to report and track local issues.',
                  style: TextStyle(color: muted),
                ),
                const SizedBox(height: 26),
                const Text('Full name'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  enabled: !_isLoading,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    hintText: 'Your full name',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  validator: (value) {
                    if ((value?.trim().length ?? 0) < 2) {
                      return 'Enter your full name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 18),
                const Text('Email address'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _emailController,
                  enabled: !_isLoading,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    hintText: 'you@example.com',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    final email = value?.trim() ?? '';

                    if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                        .hasMatch(email)) {
                      return 'Enter a valid email address';
                    }

                    return null;
                  },
                ),
                const SizedBox(height: 18),
                const Text('Phone number (optional)'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneController,
                  enabled: !_isLoading,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    hintText: '+91XXXXXXXXXX',
                    prefixIcon: Icon(Icons.phone_outlined),
                  ),
                  validator: (value) {
                    final phone = value?.trim() ?? '';

                    if (phone.isNotEmpty &&
                        !RegExp(r'^\+?[0-9]{7,15}$').hasMatch(phone)) {
                      return 'Enter a valid phone number';
                    }

                    return null;
                  },
                ),
                const SizedBox(height: 18),
                const Text('Password'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passwordController,
                  enabled: !_isLoading,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    hintText: 'At least 12 characters',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                      ),
                    ),
                  ),
                  validator: (value) {
                    if ((value?.length ?? 0) < 12) {
                      return 'Use at least 12 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 26),
                SizedBox(
                  height: 54,
                  child: FilledButton(
                    onPressed: _isLoading ? null : _register,
                    style: FilledButton.styleFrom(
                      backgroundColor: green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Create account',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ------------------------------------------------------------
// AUTHENTICATED CITIZEN DASHBOARD
// ------------------------------------------------------------

class CitizenDashboard extends StatefulWidget {
  final String initialName;

  const CitizenDashboard({super.key, required this.initialName});

  @override
  State<CitizenDashboard> createState() => _CitizenDashboardState();
}

class _CitizenDashboardState extends State<CitizenDashboard> {
  late Future<Map<String, dynamic>> _accountFuture;

  @override
  void initState() {
    super.initState();
    _accountFuture = ApiService.getMyAccount();
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _logout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
      (route) => false,
    );
  }

  void _comingSoon(String feature) {
    _showMessage('$feature is the next feature we will connect.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'GRAMSEVA',
          style: TextStyle(
            color: green,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Log out',
            onPressed: _logout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            setState(() => _accountFuture = ApiService.getMyAccount());
            await _accountFuture;
          },
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: green,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: FutureBuilder<Map<String, dynamic>>(
                  future: _accountFuture,
                  builder: (context, snapshot) {
                    final name =
                        snapshot.data?['full_name']?.toString() ??
                        widget.initialName;
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.waving_hand_rounded,
                          color: Colors.white,
                          size: 32,
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'Namaste, $name!',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Your voice. Your village. Better services.',
                          style: TextStyle(color: Colors.white, fontSize: 14),
                        ),
                        if (snapshot.connectionState ==
                            ConnectionState.waiting) ...[
                          const SizedBox(height: 12),
                          const LinearProgressIndicator(
                            color: Colors.white,
                            backgroundColor: Color(0x66FFFFFF),
                          ),
                        ],
                        if (snapshot.hasError) ...[
                          const SizedBox(height: 12),
                          const Text(
                            'Could not refresh account details. Pull down to retry.',
                            style: TextStyle(color: Colors.white),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'How can we help today?',
                style: TextStyle(
                  color: ink,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 14),
              _DashboardActionCard(
                icon: Icons.add_circle_outline,
                title: 'Report a problem',
                subtitle:
                    'Report water, streetlight, drainage and other issues.',
                onTap: () => _comingSoon('Complaint reporting'),
              ),
              const SizedBox(height: 12),
              _DashboardActionCard(
                icon: Icons.track_changes,
                title: 'Track my complaints',
                subtitle: 'Follow updates on the issues you have reported.',
                onTap: () => _comingSoon('Complaint tracking'),
              ),
              const SizedBox(height: 12),
              _DashboardActionCard(
                icon: Icons.verified_outlined,
                title: 'Verify a resolution',
                subtitle:
                    'Tell us if the reported problem has really been solved.',
                onTap: () => _comingSoon('Resolution verification'),
              ),
              const SizedBox(height: 24),
              FutureBuilder<Map<String, dynamic>>(
                future: _accountFuture,
                builder: (context, snapshot) {
                  final account = snapshot.data;
                  if (account == null) return const SizedBox.shrink();
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFDCE5DD)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Your account',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: ink,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _AccountDetail(
                          label: 'Email',
                          value: account['email']?.toString() ?? '—',
                        ),
                        _AccountDetail(
                          label: 'Role',
                          value: account['role']?.toString() ?? 'citizen',
                        ),
                        _AccountDetail(
                          label: 'Identity status',
                          value:
                              account['identity_status']?.toString() ??
                              'unverified',
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 18),
              const Center(
                child: Text(
                  'Building accountable rural governance, together.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: muted, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DashboardActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _DashboardActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFDCE5DD)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: paleGreen,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: green, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        color: ink,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      subtitle,
                      style: const TextStyle(color: muted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccountDetail extends StatelessWidget {
  final String label;
  final String value;

  const _AccountDetail({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 112,
            child: Text(label, style: const TextStyle(color: muted)),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: ink, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
