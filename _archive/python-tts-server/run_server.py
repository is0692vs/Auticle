#!/usr/bin/env python3
"""
Edge TTS Server 起動スクリプト (Python版)
シェルスクリプトを使わずにサーバーを起動します
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    # スクリプトのディレクトリを取得
    script_dir = Path(__file__).parent
    venv_python = script_dir / "venv" / "bin" / "python"
    server_py = script_dir / "server.py"
    
    # venvのPythonが存在するかチェック
    if not venv_python.exists():
        print("❌ 仮想環境が見つかりません。以下のコマンドで作成してください:")
        print("   python3 -m venv venv")
        print("   source venv/bin/activate")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    
    # サーバーファイルが存在するかチェック
    if not server_py.exists():
        print("❌ server.py が見つかりません。")
        sys.exit(1)
    
    print("🎤 Edge TTS Server を起動しています...")
    print("📡 サーバーアドレス: http://localhost:8001")
    print("📄 API ドキュメント: http://localhost:8001/docs")
    print("🔄 停止するには Ctrl+C を押してください")
    print("")
    
    try:
        # venv環境のPythonでserver.pyを実行
        subprocess.run([str(venv_python), str(server_py)], cwd=script_dir)
    except KeyboardInterrupt:
        print("\n🛑 サーバーを停止しました")
    except Exception as e:
        print(f"❌ エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()