package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const memory uint32 = 32768
const iterations uint32 = 4
const parallelism uint8 = 4
const keyLength uint32 = 32
const saltLength uint32 = 16

func Hash(password string) string {
	salt := generateSalt(saltLength)
	hash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, keyLength)

	saltBase64 := base64.RawStdEncoding.EncodeToString(salt)
	hashBase64 := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, memory, iterations, parallelism, saltBase64, hashBase64)
}

func Verify(password string, hashedPassword string) bool {
	parts := strings.Split(hashedPassword, "$")
	if len(parts) != 6 {
		return false
	}

	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil || version != argon2.Version {
		return false
	}

	parsedParams := struct {
		Memory, Time, Threads uint32
		Salt, Hash            []byte
	}{}

	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &parsedParams.Memory, &parsedParams.Time, &parsedParams.Threads)
	if err != nil {
		return false
	}

	parsedParams.Salt, err = base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}

	parsedParams.Hash, err = base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}

	computedHash := argon2.IDKey([]byte(password), parsedParams.Salt, parsedParams.Time, parsedParams.Memory, parallelism, uint32(len(parsedParams.Hash)))

	if subtle.ConstantTimeCompare(parsedParams.Hash, computedHash) == 1 {
		return true
	}

	return false
}

func generateSalt(saltLength uint32) []byte {
	result := make([]byte, saltLength)
	_, err := rand.Read(result)
	if err != nil {
		panic(fmt.Sprintf("Failed to generate salt: %v", err))
	}
	return result
}
