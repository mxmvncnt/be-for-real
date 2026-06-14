package main

import (
	"bfrl/config"
	"bfrl/database"
	"bfrl/middleware"
	"bfrl/routes"
	"bfrl/utils/logger"
	"context"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/cors"
)

func main() {
	router := http.NewServeMux()

	dbPool, dbErr := pgxpool.New(context.Background(), config.DatabaseURL)
	if dbErr != nil {
		logger.Fatalf("Failed to initialize database: %v", dbErr)
	}
	defer dbPool.Close()
	queries := database.New(dbPool)
	dbErr = dbPool.Ping(context.Background())
	if dbErr != nil {
		logger.Fatalf("Failed to connect to database: %v", dbErr)
	}

	routeHandler := routes.NewRoutesHandler(queries)
	router.HandleFunc("GET /ping", middleware.Combined(routeHandler.Ping))
	router.HandleFunc("POST /auth/register", middleware.Combined(routeHandler.Register))
	router.HandleFunc("POST /auth/login", middleware.Combined(routeHandler.Login))
	router.HandleFunc("DELETE /auth/logout", middleware.Combined(routeHandler.TerminateSession))

	logger.Info("Server started on http://" + config.ServerHostname + ":" + config.ServerPort)
	handler := cors.AllowAll().Handler(router)
	err := http.ListenAndServe(config.ServerHostname+":"+config.ServerPort, handler)
	if err != nil {
		panic(err)
	}
}
