import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiService {
  // Android emulator -> your Mac's FastAPI server.
  static const String baseUrl = 'http://10.0.2.2:8000';

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  static const String _tokenKey = 'gramseva_access_token';

  static Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String password,
    String? phone,
  }) async {
    final body = <String, dynamic>{
      'full_name': fullName.trim(),
      'email': email.trim().toLowerCase(),
      'password': password,
      if (phone != null && phone.trim().isNotEmpty) 'phone': phone.trim(),
    };

    return _sendAuthenticationRequest('/auth/register', body);
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    return _sendAuthenticationRequest('/auth/login', {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
  }

  static Future<Map<String, dynamic>> _sendAuthenticationRequest(
    String path,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl$path'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 15));

      Map<String, dynamic> data;
      try {
        final decoded = jsonDecode(response.body);
        data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
      } on FormatException {
        data = <String, dynamic>{};
      }

      if (response.statusCode == 200 || response.statusCode == 201) {
        final token = data['access_token'];

        if (token is! String || token.isEmpty) {
          throw const ApiException(
            'The server response did not contain an access token.',
          );
        }

        await _storage.write(key: _tokenKey, value: token);

        final user = data['user'];
        return user is Map<String, dynamic> ? user : <String, dynamic>{};
      }

      final detail = data['detail'];
      final message = detail is String
          ? detail
          : 'Authentication failed. Please try again.';

      throw ApiException(message, statusCode: response.statusCode);
    } on ApiException {
      rethrow;
    } on http.ClientException {
      throw const ApiException(
        'Could not connect to GRAMSEVA. Check that the backend is running.',
      );
    } on FormatException {
      throw const ApiException('The server returned an invalid response.');
    } on Exception catch (error) {
      if (error is ApiException) rethrow;
      throw const ApiException('A network error occurred. Please try again.');
    }
  }

  static Future<Map<String, dynamic>> getMyAccount() async {
    final token = await _storage.read(key: _tokenKey);

    if (token == null || token.isEmpty) {
      throw const ApiException('Please log in first.');
    }

    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/auth/me'),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is Map<String, dynamic>) return data;
      }

      if (response.statusCode == 401) {
        await logout();
        throw const ApiException(
          'Your session expired. Please log in again.',
          statusCode: 401,
        );
      }

      throw ApiException(
        'Could not load your account.',
        statusCode: response.statusCode,
      );
    } on ApiException {
      rethrow;
    } on Exception {
      throw const ApiException(
        'Could not reach GRAMSEVA. Check your connection.',
      );
    }
  }

  static Future<void> logout() async {
    await _storage.delete(key: _tokenKey);
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}
