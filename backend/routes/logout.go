package routes

import (
	"bfrl/utils/apierror"
	"context"
	"net/http"

	"github.com/go-http-utils/headers"
)

func (handler *RoutesHandler) TerminateSession(w http.ResponseWriter, r *http.Request) error {
	token := r.Header.Get(headers.Authorization)

	dbErr := handler.db.TerminateSession(context.Background(), token)
	if dbErr != nil {
		if dbErr.Error() == "no rows in result set" {
			return apierror.NewApiError(
				http.StatusNotFound,
				"no_session_found",
				"Could not delete non-existent session.",
				"The requested session token did not exist.")
		}
		return dbErr
	}

	return nil
}
