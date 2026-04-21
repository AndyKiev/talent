set -e

KEYS_DIR="/app/backend/auth/keys"

mkdir -p "$KEYS_DIR"

if [ ! -f "$KEYS_DIR/private_key.pem" ] || [ ! -f "$KEYS_DIR/public_key.pem" ]; then
    echo "Generating new JWT keys..."
    openssl genrsa -out "$KEYS_DIR/private_key.pem" 2048
    echo "Generated private_key.pem"
    openssl rsa -in "$KEYS_DIR/private_key.pem" -outform PEM -pubout -out "$KEYS_DIR/public_key.pem"
    echo "Generated public_key.pem"
    chmod 644 "$KEYS_DIR/private_key.pem" "$KEYS_DIR/public_key.pem"
else
    echo "JWT keys already exist. Skipping key generation."
fi