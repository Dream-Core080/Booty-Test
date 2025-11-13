// ignore_for_file: use_build_context_synchronously

import 'package:bbb/components/app_alert_dialog.dart';
import 'package:bbb/components/app_text_form_field.dart';
import 'package:bbb/components/back_arrow_widget.dart';
import 'package:bbb/components/button_widget.dart';
import 'package:bbb/values/app_colors.dart';
import 'package:bbb/values/app_constants.dart';
import 'package:bbb/values/clip_path.dart';
import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormState>();
  TextEditingController emailController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();

  TextEditingController phoneController = TextEditingController();

  bool isObscure = true;
  bool isLoading = false;

  registerUser(String emailAddress, String password) async {
    try {
      setState(() {
        isLoading = true;
      });

      final Map<String, String> bodyParams = {
        'email': emailAddress,
        'password': password,
        'phone': phoneController.text,
      };

      Uri url = Uri.parse('${AppConstants.serverUrl}/api/users/register_user');
      url = Uri.http(url.authority, url.path);

      final response = await http.post(
        url,
        headers: <String, String>{
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams,
      );

      final responseData = json.decode(response.body);

      if (response.statusCode == 200 && responseData['success'] == true) {
        // Show success message
        showDialog(
          context: context,
          builder: (BuildContext context) {
            return AppAlertDialog(
              title: "Registration Successful",
              description: responseData['message'] ?? 
                  "Please check your email to verify your account before logging in.",
            );
          },
        ).then((_) {
          // Navigate back to login page after user acknowledges
          Navigator.pop(context);
        });
      } else {
        // Handle error response
        String errorMessage = responseData['message'] ?? 
            'Registration failed. Please try again.';
        
        if (responseData['error']) {
          errorMessage = responseData['error'];
        }

        showDialog(
          context: context,
          builder: (BuildContext context) {
            return AppAlertDialog(
              title: "Registration Failed",
              description: errorMessage,
            );
          },
        );
      }
    } catch (e) {
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return const AppAlertDialog(
            title: "Error",
            description: "An error occurred during registration. Please try again.",
          );
        },
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    var media = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        physics: const ClampingScrollPhysics(), 
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              SizedBox(
                height: media.height / 3.49,
                width: media.width,
                child: Stack(
                  children: [
                    Container(
                      width: media.width,
                      height: media.height / 2.42,
                      decoration: const BoxDecoration(
                        color: AppColors.primaryColor,
                      ),
                    ),
                    BackArrowWidget(onPress: () => {Navigator.pop(context)}),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: ClipPath(
                        clipper: DiagonalClipper(),
                        child: Container(
                          height: 70,
                          width: 60,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Stack(
                children: [
                  Container(
                    width: media.width,
                    height: media.height,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryColor,
                    ),
                  ),
                  Container(
                    height: media.height,
                    decoration: const BoxDecoration(
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(70),
                        ),
                        color: Colors.white),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 40,
                      ),
                      child: Column(
                        children: [
                          const SizedBox(
                            height: 25,
                          ),
                          const Text(
                            'Create an account',
                            style: TextStyle(
                              fontSize: 22,
                              color: Color(0xff9A354E),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(
                            height: 20,
                          ),
                          AppTextFormField(
                            hintText: 'Email Address',
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            onChanged: (value) {},
                            validator: (value) {
                              return value!.isEmpty
                                  ? 'Please, Enter Email Address'
                                  : AppConstants.emailRegex.hasMatch(value)
                                      ? null
                                      : 'Invalid Email Address';
                            },
                            controller: emailController,
                            suffixIcon: Padding(
                              padding: const EdgeInsets.only(right: 15),
                              child: IconButton(
                                onPressed: () {},
                                style: ButtonStyle(
                                  minimumSize: WidgetStateProperty.all(
                                    const Size(48, 48),
                                  ),
                                ),
                                icon: const Icon(
                                  Icons.person,
                                  color: Color(0XFFd9d9d9),
                                ),
                              ),
                            ),
                          ),
                          AppTextFormField(
                            hintText: 'Password',
                            keyboardType: TextInputType.visiblePassword,
                            textInputAction: TextInputAction.done,
                            onChanged: (value) {},
                            validator: (value) {
                              return value!.isEmpty
                                  ? 'Please, Enter Password'
                                  : value.length <= 5
                                      ? 'Password length must be greater than 6'
                                      : null;
                              //: AppConstants.passwordRegex.hasMatch(value)
                              //    ? null
                              //    : 'Invalid Password';
                            },
                            controller: passwordController,
                            obscureText: isObscure,
                            suffixIcon: Padding(
                              padding: const EdgeInsets.only(right: 15),
                              child: IconButton(
                                onPressed: () {
                                  setState(() {
                                    isObscure = !isObscure;
                                  });
                                },
                                style: ButtonStyle(
                                  minimumSize: WidgetStateProperty.all(
                                    const Size(48, 48),
                                  ),
                                ),
                                icon: Icon(
                                  isObscure
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  color: const Color(0XFFd9d9d9),
                                ),
                              ),
                            ),
                          ),
                          AppTextFormField(
                            hintText: 'Confirm Password',
                            keyboardType: TextInputType.visiblePassword,
                            textInputAction: TextInputAction.done,
                            onChanged: (value) {},
                            validator: (value) {
                              return value!.isEmpty
                                  ? 'Please, Confirm Password'
                                  : passwordController.text == value
                                      ? null
                                      : 'Password Does not Match';
                              //: AppConstants.passwordRegex.hasMatch(value)
                              //    ? null
                              //    : 'Invalid Password';
                            },
                            controller: confirmPasswordController,
                            obscureText: isObscure,
                            suffixIcon: Padding(
                              padding: const EdgeInsets.only(right: 15),
                              child: IconButton(
                                onPressed: () {
                                  setState(() {
                                    isObscure = !isObscure;
                                  });
                                },
                                style: ButtonStyle(
                                  minimumSize: WidgetStateProperty.all(
                                    const Size(48, 48),
                                  ),
                                ),
                                icon: Icon(
                                  isObscure
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  color: const Color(0XFFd9d9d9),
                                ),
                              ),
                            ),
                          ),
                          AppTextFormField(
                            hintText: 'Phone Number',
                            keyboardType: TextInputType.text,
                            textInputAction: TextInputAction.next,
                            onChanged: (value) {},
                            // validator: (value) {
                            //   return value!.isEmpty
                            //       ? 'Please enter Phone Number'
                            //       : null;
                            // },
                            controller: phoneController,
                            suffixIcon: Padding(
                              padding: const EdgeInsets.only(right: 15),
                              child: IconButton(
                                onPressed: () {},
                                style: ButtonStyle(
                                  minimumSize: WidgetStateProperty.all(
                                    const Size(48, 48),
                                  ),
                                ),
                                icon: const Icon(
                                  Icons.person,
                                  color: Color(0XFFd9d9d9),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(
                            height: 40,
                          ),
                          ButtonWidget(
                            text: 'Create an Account',
                            textColor: Colors.white,
                            color: const Color(0xff9A354E),
                            onPress: () => {
                              if (_formKey.currentState?.validate() == true)
                                {
                                  registerUser(
                                    emailController.text,
                                    passwordController.text,
                                  )
                                }
                            },
                            isLoading: isLoading,
                          ),
                          const SizedBox(
                            height: 10,
                          ),
                        ],
                      ),
                    ),
                  )
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}
