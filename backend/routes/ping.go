package routes

import (
	"bfrl/utils"
	"net/http"
)

func (handler *RoutesHandler) Ping(w http.ResponseWriter, r *http.Request) error {
	utils.SendJsonResponse(w, http.StatusOK, "pong!")
	return nil
}
