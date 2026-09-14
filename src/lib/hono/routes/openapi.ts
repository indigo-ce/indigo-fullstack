export const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Indigo API",
    version: "1.0.0",
    description: "REST API for Indigo mobile and external clients."
  },
  servers: [{url: "/api/v1"}],
  components: {
    securitySchemes: {
      basicAuth: {
        type: "http",
        scheme: "basic"
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {type: "string"}
        }
      },
      User: {
        type: "object",
        required: ["id", "email", "name"],
        properties: {
          id: {type: "string"},
          email: {type: "string", format: "email"},
          name: {type: "string"},
          image: {type: ["string", "null"]},
          emailVerified: {type: "boolean"},
          createdAt: {type: "string", format: "date-time"},
          updatedAt: {type: "string", format: "date-time"}
        }
      },
      SignInUser: {
        type: "object",
        required: ["id", "email", "name", "image"],
        properties: {
          id: {type: "string"},
          email: {type: "string", format: "email"},
          name: {type: "string"},
          image: {type: ["string", "null"]}
        }
      },
      SignUpResponse: {
        type: "object",
        required: ["user", "token"],
        properties: {
          user: {$ref: "#/components/schemas/User"},
          token: {type: ["string", "null"]}
        }
      },
      SignInResponse: {
        type: "object",
        required: ["user", "accessToken", "refreshToken", "tokenType"],
        properties: {
          user: {$ref: "#/components/schemas/SignInUser"},
          accessToken: {type: "string"},
          refreshToken: {type: "string"},
          tokenType: {type: "string", example: "Bearer"}
        }
      },
      TokenResponse: {
        type: "object",
        required: ["accessToken", "refreshToken", "tokenType"],
        properties: {
          accessToken: {type: "string"},
          refreshToken: {type: "string"},
          tokenType: {type: "string", example: "Bearer"}
        }
      },
      StatusResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: {type: "boolean"}
        }
      },
      ForgotPasswordResponse: {
        type: "object",
        required: ["status", "message"],
        properties: {
          status: {type: "boolean"},
          message: {type: "string"}
        }
      },
      SuccessResponse: {
        type: "object",
        required: ["success"],
        properties: {
          success: {type: "boolean", const: true}
        }
      },
      HealthResponse: {
        type: "object",
        required: ["status"],
        properties: {
          status: {type: "string", const: "ok"}
        }
      },
      PostsResponse: {
        type: "object",
        required: ["posts"],
        properties: {
          posts: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "title"],
              properties: {
                id: {type: "number"},
                title: {type: "string"}
              }
            }
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: "The request body is invalid.",
        content: {
          "application/json": {
            schema: {$ref: "#/components/schemas/Error"}
          }
        }
      },
      Unauthorized: {
        description: "Authentication credentials or tokens are invalid.",
        content: {
          "application/json": {
            schema: {$ref: "#/components/schemas/Error"}
          }
        }
      },
      NotFound: {
        description:
          "No route matches the requested path, or the referenced resource does not exist.",
        content: {
          "application/json": {
            schema: {$ref: "#/components/schemas/Error"}
          }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Check API health",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "The API is healthy.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/HealthResponse"}
              }
            }
          }
        },
        security: []
      }
    },
    "/routes": {
      get: {
        summary: "List registered API routes",
        operationId: "listRoutes",
        responses: {
          "200": {
            description: "Registered method and path pairs.",
            content: {
              "application/json": {
                schema: {type: "array", items: {type: "string"}}
              }
            }
          }
        },
        security: []
      }
    },
    "/openapi.json": {
      get: {
        summary: "Get the OpenAPI document for the v1 API",
        operationId: "getOpenApiDocument",
        responses: {
          "200": {
            description: "The OpenAPI 3.1 document describing the v1 API.",
            content: {
              "application/json": {
                schema: {type: "object"}
              }
            }
          }
        },
        security: []
      }
    },
    "/auth/sign-up": {
      post: {
        summary: "Create an account",
        operationId: "signUp",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: {type: "string", format: "email"},
                  password: {type: "string", minLength: 1},
                  name: {type: "string", minLength: 1},
                  callbackURL: {type: "string"}
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "The account was created.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/SignUpResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"}
        },
        security: []
      }
    },
    "/auth/sign-in": {
      post: {
        summary: "Exchange credentials for access and refresh tokens",
        operationId: "signIn",
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: {type: "string"},
            description: "Basic base64(email:password)"
          }
        ],
        responses: {
          "200": {
            description: "JWT access and refresh tokens.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/SignInResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"},
          "401": {$ref: "#/components/responses/Unauthorized"}
        },
        security: [{basicAuth: []}]
      }
    },
    "/auth/send-verification-email": {
      post: {
        summary: "Send an email verification message",
        operationId: "sendVerificationEmail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: {type: "string", format: "email"},
                  callbackURL: {type: "string"}
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "The verification email was sent.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/StatusResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"}
        },
        security: []
      }
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request a password reset",
        operationId: "forgotPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: {type: "string", format: "email"},
                  redirectTo: {type: "string"}
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "The password reset email was sent.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/ForgotPasswordResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"}
        },
        security: []
      }
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset a password",
        operationId: "resetPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newPassword", "token"],
                properties: {
                  newPassword: {type: "string", minLength: 1},
                  token: {type: "string", minLength: 1}
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "The password was reset.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/StatusResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"}
        },
        security: []
      }
    },
    "/auth/refresh-access": {
      post: {
        summary: "Refresh access and refresh tokens",
        operationId: "refreshAccessTokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {refreshToken: {type: "string", minLength: 1}}
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Rotated JWT access and refresh tokens.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/TokenResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"},
          "401": {$ref: "#/components/responses/Unauthorized"},
          "404": {$ref: "#/components/responses/NotFound"}
        },
        security: []
      }
    },
    "/auth/revoke-access": {
      post: {
        summary: "Revoke a refresh token",
        operationId: "revokeAccessTokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {refreshToken: {type: "string", minLength: 1}}
              }
            }
          }
        },
        responses: {
          "200": {
            description: "The refresh token was revoked.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/SuccessResponse"}
              }
            }
          },
          "400": {$ref: "#/components/responses/BadRequest"}
        },
        security: []
      }
    },
    "/account/profile": {
      get: {
        summary: "Get the authenticated user profile",
        operationId: "getAccountProfile",
        responses: {
          "200": {
            description: "The authenticated user.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/User"}
              }
            }
          },
          "401": {$ref: "#/components/responses/Unauthorized"}
        },
        security: [{bearerAuth: []}]
      }
    },
    "/account/posts": {
      get: {
        summary: "List the authenticated user's posts",
        operationId: "getAccountPosts",
        responses: {
          "200": {
            description: "The authenticated user's posts.",
            content: {
              "application/json": {
                schema: {$ref: "#/components/schemas/PostsResponse"}
              }
            }
          },
          "401": {$ref: "#/components/responses/Unauthorized"}
        },
        security: [{bearerAuth: []}]
      }
    }
  }
};
