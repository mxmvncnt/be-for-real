package auth

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type User struct {
	ID           uuid.UUID   `json:"id"`
	Email        pgtype.Text `json:"-"`
	Username     string      `json:"username"`
	ProfileImage pgtype.Text `json:"profile_image"`
	CreatedAt    time.Time   `json:"created_at"`
}
