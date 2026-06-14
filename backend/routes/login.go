package routes

import (
	"bfrl/auth"
	"bfrl/utils"
	"bfrl/utils/apierror"
	"bfrl/utils/logger"
	"encoding/json"
	"net/http"
)

func (handler *RoutesHandler) Login(w http.ResponseWriter, r *http.Request) error {
	var requestBody struct {
		Email         string `json:"email"`
		Password      string `json:"password"`
		IsLongSession bool   `json:"rememberMe"`
	}

	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&requestBody); err != nil {
		logger.Errorf("[AuthPassword.go - Login] Failed to decode JSON body: %s", err)
		return err
	}

	if requestBody.Email == "" || requestBody.Password == "" {
		return apierror.NewApiError(
			http.StatusBadRequest,
			"missing_email_or_password",
			"Both an email and a password are required.",
			"Either the email, the password, or both are empty")
	}

	logger.Infof("[AuthPassword.go - Login] Received login request for email: %s", requestBody.Email)

	invalidCredentialsError := apierror.NewApiError(
		http.StatusUnauthorized,
		"invalid_credentials",
		"Could not proceed with log in.",
		"Either the provided password, email or both were invalid.")

	user, err := handler.db.GetUserFromToken(r.Context(), requestBody.Email)
	if err != nil {
		return invalidCredentialsError
	}
	isPasswordValid := auth.Verify(requestBody.Password, user.User.Password)

	if isPasswordValid {
		session, _ := auth.CreateSession(handler.db, user.User.ID)
		utils.SendJsonResponse(w, http.StatusOK, session)
		return nil
	}

	return invalidCredentialsError
}
