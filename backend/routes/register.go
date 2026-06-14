package routes

import (
	"bfrl/auth"
	"bfrl/database"
	"bfrl/utils"
	"bfrl/utils/apierror"
	"bfrl/utils/logger"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"regexp"
	"strconv"

	"github.com/jackc/pgx/v5/pgconn"
)

const minPasswordLength = 8

func (handler *RoutesHandler) Register(w http.ResponseWriter, r *http.Request) error {
	var requestBody struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Username string `json:"username"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&requestBody); err != nil {
		logger.Errorf("[register.go - Register] Failed to decode JSON body: %s", err)
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"bad_request_body",
			"Make sure your body contains an email and a password field.",
			"Failed to parse JSON body")
		return apiError
	}

	if requestBody.Email == "" || requestBody.Password == "" {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"missing_email_or_password",
			"Both an email and a password are required.",
			"Either the email, the password, or both are empty")
		return apiError
	}

	if len(requestBody.Email) > 254 {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"email_too_long",
			"The provided email is invalid.",
			"The provided email must be less than 254 characters long.")
		return apiError
	}

	if len(requestBody.Password) > 1024 {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"password_too_long",
			"The provided password is invalid.",
			"The provided password must be less than 1024 characters long.")
		return apiError
	}

	if len(requestBody.Username) > 32 {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"username_too_long",
			"The provided username is invalid.",
			"The provided username must be less than 32 characters long.")
		return apiError
	}

	validUsernameRegex := regexp.MustCompile(`^[a-zA-Z0-9]+$`)
	if !validUsernameRegex.MatchString(requestBody.Username) {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"invalid_username",
			"The provided username is invalid.",
			"The provided username must contain only number and letters from the latin alphabet.")
		return apiError
	}

	_, emailValidationErr := mail.ParseAddress(requestBody.Email)
	if emailValidationErr != nil {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"invalid_email",
			"The provided email is invalid.",
			"The provided email must be a valid email address.")
		return apiError
	}

	if len(requestBody.Password) < minPasswordLength {
		apiError := apierror.NewApiError(
			http.StatusBadRequest,
			"password_too_short",
			"Your password is too short.",
			"The password must be at least "+strconv.Itoa(minPasswordLength)+" characters long.")
		return apiError
	}

	user, err := handler.db.CreateUser(context.Background(), database.CreateUserParams{
		Email:         requestBody.Email,
		Password:      auth.Hash(requestBody.Password),
		Username:      requestBody.Username,
		Description:   "",
		ProfilePicUrl: "",
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch pgErr.Code {
			case "23505": // UNIQUE VIOLATION
				return apierror.NewApiError(
					http.StatusConflict,
					"account_already_exists",
					"Could not register your account",
					"An account is already registered using this email or username.")
			}
		}
	}

	session, _ := auth.CreateSession(handler.db, user.ID)
	utils.SendJsonResponse(w, http.StatusOK, session)
	return nil
}
