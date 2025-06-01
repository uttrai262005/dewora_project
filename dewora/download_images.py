import json
import requests
import os

def download_image(url, folder_path, filename):
    """Downloads an image from a URL and saves it to a specified folder."""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'wb') as out_file:
            response.raw.decode_content = True
            for chunk in response.iter_content(chunk_size=8192):
                out_file.write(chunk)
        print(f"Downloaded: {filename}")
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def main():
    json_file_path = 'products.json'
    download_folder = 'downloaded_product_images'

    # Create the download folder if it doesn't exist
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)
        print(f"Created folder: {download_folder}")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            products = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file '{json_file_path}' was not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{json_file_path}'. Please check the file's format.")
        return

    for product in products:
        product_id = product.get("id")
        product_name = product.get("name", "unknown_product").replace("/", "_").replace("\\", "_") # Clean name for folder
        images = product.get("images")

        if product_id is None:
            print(f"Skipping a product with no 'id'. Product details: {product}")
            continue

        if images and isinstance(images, list):
            # Create a subfolder for each product's images
            product_image_folder = os.path.join(download_folder, f"{product_id}_{product_name[:50]}") # Limit name length
            if not os.path.exists(product_image_folder):
                os.makedirs(product_image_folder)
                print(f"Created subfolder: {product_image_folder}")

            for i, image_url in enumerate(images):
                if image_url:
                    # Extract original filename from URL and handle query parameters
                    original_filename = os.path.basename(image_url.split('?')[0])
                    # Create a unique filename for each image, e.g., prod_1_img_0_originalname.webp
                    filename = f"img_{i+1}_{original_filename}"
                    download_image(image_url, product_image_folder, filename)
                else:
                    print(f"Product {product_id} has an empty image URL at index {i}.")
        else:
            print(f"Product {product_id} ('{product_name}') has no 'images' key or it's not a list.")

    print("\nImage download process completed.")

if __name__ == "__main__":
    main()