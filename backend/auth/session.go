package auth

import (
	"bfrl/database"
	"bfrl/utils/apierror"
	"bfrl/utils/logger"
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type SessionResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

const SessionTokenLength = 64
const SessionLength = time.Hour * 24 * 7

func generateSessionToken(length int) (string, error) {
	result := make([]byte, length)
	_, err := rand.Read(result)
	if err != nil {
		logger.Errorf("[Session.go - GenerateSessionToken] Could not generate session token: %v", err)
		return "", apierror.NewApiErrorWithError(
			http.StatusConflict,
			"insertion_error",
			"An unknown error has happened",
			"Error while getting email validation code in the database.",
			err,
		)
	}
	return base64.StdEncoding.EncodeToString(result), nil
}

func CreateSession(dbPool *database.Queries, userID uuid.UUID) (SessionResponse, error) {
	sessionToken, err := generateSessionToken(SessionTokenLength)
	if err != nil {
		return SessionResponse{}, err
	}

	expirationTime := time.Now().Add(time.Hour * 24 * 7)
	createSessionParams := database.CreateSessionParams{
		Token:     sessionToken,
		UserID:    userID,
		ExpiresAt: expirationTime,
	}

	dbErr := dbPool.CreateSession(context.Background(), createSessionParams)
	if dbErr != nil {
		// TODO: better error handling
		return SessionResponse{}, err
	}

	logger.Debugf("Created new session for user: %s", userID)

	var sessionResponse SessionResponse
	sessionResponse.Token = sessionToken
	sessionResponse.ExpiresAt = expirationTime

	return sessionResponse, nil
}

func ValidateSession(dbPool *database.Queries, userID uuid.UUID) (SessionResponse, error) {
	// TODO: implement
	return SessionResponse{}, nil
}

func ExtendSession(dbPool *database.Queries, token string) (SessionResponse, error) {
	expirationTime := time.Now().Add(SessionLength)
	extendSessionParams := database.ExtendSessionParams{
		Token:     token,
		ExpiresAt: expirationTime,
	}

	dbErr := dbPool.ExtendSession(context.Background(), extendSessionParams)
	if dbErr != nil {
		return SessionResponse{}, dbErr
	}

	var sessionResponse SessionResponse
	sessionResponse.Token = token
	sessionResponse.ExpiresAt = expirationTime

	return sessionResponse, nil
}

func GetUserFromToken(dbPool *database.Queries, token string) (database.User, error) {
	if token == "" {
		return database.User{}, apierror.NewApiError(
			http.StatusBadRequest,
			"no_token",
			"A token is required.",
			"Token was empty. Make sure you are logged in.")
	}

	result, dbErr := dbPool.GetUserFromToken(context.Background(), token)
	if dbErr != nil {
		return database.User{}, dbErr
	}

	if time.Now().After(result.Session.ExpiresAt) {
		return database.User{}, apierror.NewApiError(
			http.StatusBadRequest,
			"expired_token",
			"The provided session token has expired.",
			"Create a new session by logging in again.")
	}

	return result.User, nil
}

func GetUserFromId(dbPool *database.Queries, id uuid.UUID) (database.User, error) {
	if id.String() == "" {
		return database.User{}, apierror.NewApiError(
			http.StatusBadRequest,
			"no_user_id",
			"A UserID is required.",
			"UserID was empty. Make sure you are logged in.")
	}

	result, dbErr := dbPool.GetUserFromId(context.Background(), id)
	if dbErr != nil {
		return database.User{}, dbErr
	}

	return result, nil
}
