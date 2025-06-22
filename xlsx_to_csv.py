import pandas as pd
import os

def xlsx_to_csv(xlsx_file_path, csv_file_path=None, sheet_name=0):
    """
    Convert XLSX file to CSV format
    
    Parameters:
    xlsx_file_path (str): Path to the input XLSX file
    csv_file_path (str): Path for the output CSV file (optional)
    sheet_name (str/int): Sheet name or index to convert (default: 0 - first sheet)
    
    Returns:
    str: Path to the created CSV file
    """
    try:
        # Read the XLSX file
        df = pd.read_excel(xlsx_file_path, sheet_name=sheet_name)
        
        # Generate CSV file path if not provided
        if csv_file_path is None:
            base_name = os.path.splitext(xlsx_file_path)[0]
            csv_file_path = f"{base_name}.csv"
        
        # Convert to CSV
        df.to_csv(csv_file_path, index=False)
        
        print(f"Successfully converted {xlsx_file_path} to {csv_file_path}")
        print(f"Shape: {df.shape[0]} rows, {df.shape[1]} columns")
        
        return csv_file_path
        
    except FileNotFoundError:
        print(f"Error: File '{xlsx_file_path}' not found.")
    except Exception as e:
        print(f"Error converting file: {str(e)}")
        return None

def convert_all_xlsx_in_directory(directory_path='.'):
    """
    Convert all XLSX files in a directory to CSV
    
    Parameters:
    directory_path (str): Path to the directory containing XLSX files
    """
    xlsx_files = [f for f in os.listdir(directory_path) if f.endswith('.xlsx')]
    
    if not xlsx_files:
        print("No XLSX files found in the directory.")
        return
    
    print(f"Found {len(xlsx_files)} XLSX file(s):")
    for file in xlsx_files:
        print(f"- {file}")
        file_path = os.path.join(directory_path, file)
        xlsx_to_csv(file_path)
        print()

if __name__ == "__main__":
    # Example usage:
    
    # Convert a specific file
    # xlsx_to_csv('input_file.xlsx', 'output_file.csv')
    
    # Convert all XLSX files in current directory
    convert_all_xlsx_in_directory() 