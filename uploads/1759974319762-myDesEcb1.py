

from Cryptodome.Cipher import DES
from Cryptodome.Random import get_random_bytes
from Cryptodome.Util.Padding import pad, unpad  # Load the crypto libraries

# Extra function to be called by main program
# if num = 8,16,32 return true, false otherwise
def chk_eight(num):
    num1 = num % 8
    if not num1: 
        return True
    return False

# Function to print bytes with a newline every 8 bytes (64 bits)
def print_bytes_with_newline(byte_array):
    count = 0
    for b in byte_array:
        print(format(b, '02X'), end=" ")
        count += 1
        if chk_eight(count):  # Insert newline every 8 bytes
            print()  # Carriage return to move to the next line
    print("\n")

# Start main function
BLOCK_SIZE = 8  # Size of DES cipher data block size 64 bit
original_text = 'Hello123Hello123Hello123111'
text_in_bytes = original_text.encode()  # Convert UTF-8 encoded string to bytes

print("Generating a 56-bit DES key ...")
key = get_random_bytes(8)  # Generate random bytes for DES key 64 bit (56 bits used)
print("The key is generated.\n")
print("Plaintext:")
print_bytes_with_newline(text_in_bytes)  # Print plaintext in hexadecimal format

cipher = DES.new(key, DES.MODE_ECB)  # New DES cipher using key generated
cipher_text_bytes = cipher.encrypt(pad(text_in_bytes, BLOCK_SIZE))  # Encrypt data

print("Ciphertext (in base 10 - Decimal):")
print_bytes_with_newline(cipher_text_bytes)  # Print ciphertext in decimal

print("Ciphertext (in base 16 - Hex):")
print_bytes_with_newline(cipher_text_bytes)  # Print ciphertext in hexadecimal

# ** Decrypt message here *********

# Create a new DES cipher object with the same key and mode  
my_cipher = DES.new(key, DES.MODE_ECB)

# Now decrypt the text using your new cipher
plain_text_bytes = unpad(my_cipher.decrypt(cipher_text_bytes), BLOCK_SIZE)

# Print the decrypted message in UTF8 (normal readable way)
print("Decrypted Message is:", plain_text_bytes.decode())