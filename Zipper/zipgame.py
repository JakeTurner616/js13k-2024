import zipfile

def create_zip(files, output_zip):
    # Create a zip file with maximum compression
    with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for file in files:
            zipf.write(file, arcname=file)

# List of files you want to compress
files_to_compress = ['./dist/tiles.png', './dist/index.html']
output_zip = './dist/compressed_files.zip'

# Create the zip file with aggressive compression
create_zip(files_to_compress, output_zip)

print(f"Created {output_zip} with maximum compression.")