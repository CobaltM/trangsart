import subprocess
import sys

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        print(e.stderr)
        sys.exit(1)

# Git commands
run_command("git pull")
run_command("git add .")
run_command('git commit -m "This is a Trang Commit"')
run_command("git push origin main")

print("All commands executed successfully.")
