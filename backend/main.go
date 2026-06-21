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
	logger.Infof("Starting server with config: '%s'", config.ConfigName)
	router := http.NewServeMux()

	dbPool, err := pgxpool.New(context.Background(), config.DatabaseURL)
	if err != nil {
		logger.Fatalf("Failed to initialize database: %v", err)
	}
	defer dbPool.Close()
	queries := database.New(dbPool)
	err = dbPool.Ping(context.Background())
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}

	routeHandler := routes.NewRoutesHandler(queries)
	router.HandleFunc("GET /ping", middleware.Combined(routeHandler.Ping))
	router.HandleFunc("POST /auth/register", middleware.Combined(routeHandler.Register))
	router.HandleFunc("POST /auth/login", middleware.Combined(routeHandler.Login))
	router.HandleFunc("DELETE /auth/logout", middleware.Combined(routeHandler.TerminateSession))

	logger.Info("Server started on http://" + config.ServerHostname + ":" + config.ServerPort)
	handler := cors.AllowAll().Handler(router)
	err = http.ListenAndServe(config.ServerHostname+":"+config.ServerPort, handler)
	if err != nil {
		panic(err)
	}
}
