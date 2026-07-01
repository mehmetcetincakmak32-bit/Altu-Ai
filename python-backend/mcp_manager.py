"""
ALTU MCP Sunucu Yöneticisi

Tüm MCP sunucularını başlatma, durdurma ve durum kontrolü.
"""
import os
import sys
import json
import time
import signal
import logging
import subprocess
from pathlib import Path
from typing import Dict, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mcp-manager")

MCP_SERVERS = {
    "danistay": {
        "script": "danistay_mcp_server.py",
        "port": 8025,
        "name": "Danıştay Karar Arama",
        "description": "karararama.danistay.gov.tr üzerinden emsal karar arama",
        "type": "sse",
    },
    "yargitay": {
        "script": "yargitay_mcp_server.py",
        "port": 8026,
        "name": "Yargıtay Karar Arama",
        "description": "karararama.yargitay.gov.tr üzerinden emsal karar arama",
        "type": "sse",
    },
    "mevzuat": {
        "script": "mevzuat_mcp_server.py",
        "port": 8027,
        "name": "Mevzuat Bilgi Sistemi",
        "description": "mevzuat.gov.tr üzerinden kanun, yönetmelik, tüzük arama",
        "type": "sse",
    },
    "resmigazete": {
        "script": "resmigazete_mcp_server.py",
        "port": 8028,
        "name": "Resmi Gazete",
        "description": "resmigazete.gov.tr üzerinden RG yayınları arama",
        "type": "sse",
    },
    "aym": {
        "script": "aym_mcp_server.py",
        "port": 8029,
        "name": "Anayasa Mahkemesi Kararları",
        "description": "AYM bireysel başvuru ve iptal kararları arama",
        "type": "sse",
    },
    "yargi_mcp_pypi": {
        "command": "yargi-mcp",
        "module": "mcp_server_main",
        "name": "Yargıtay/Danıştay/AYM (yargi-mcp)",
        "description": "Bedesten, Anayasa, KVKK, BDDK üzerinden birleşik arama (PyPI)",
        "type": "stdio",
    },
    "ictihat_pypi": {
        "command": "turk-hukuku-ictihat",
        "module": "turk_hukuku_ictihat.server",
        "name": "Türk Hukuk İçtihat (UYAP)",
        "description": "UYAP içtihat arama motoru üzerinden Yargıtay/Danıştay kararları (PyPI)",
        "type": "stdio",
    },
    "mevzuat_pypi": {
        "command": "turk-hukuku-mevzuat",
        "module": "turk_hukuku_mevzuat.server",
        "name": "Türk Hukuk Mevzuat",
        "description": "mevzuat.gov.tr üzerinden kanun, yönetmelik, tüzük metinleri (PyPI)",
        "type": "stdio",
    },
}

_processes: Dict[str, subprocess.Popen] = {}


def start_server(name: str) -> bool:
    """Start a specific MCP server."""
    if name in _processes and _processes[name].poll() is None:
        logger.info(f"'{name}' zaten çalışıyor.")
        return True

    info = MCP_SERVERS.get(name)
    if not info:
        logger.error(f"'{name}' bilinmeyen sunucu.")
        return False

    server_type = info.get("type", "sse")

    if server_type == "stdio":
        command = info.get("command")
        if not command:
            logger.error(f"'{name}' için komut tanımlanmamış.")
            return False

        try:
            log_dir = Path(__file__).parent / "logs"
            log_dir.mkdir(exist_ok=True)
            log_file = log_dir / f"{name}.log"
            log_file_handle = open(log_file, "w", encoding="utf-8")

            proc = subprocess.Popen(
                [sys.executable, "-m", info["module"]],
                stdout=log_file_handle,
                stderr=log_file_handle,
            )
            _processes[name] = proc
            logger.info(f"✓ '{info['name']}' başlatıldı (PID: {proc.pid}, Tip: stdio, Log: logs/{name}.log)")
            return True
        except Exception as e:
            logger.error(f"'{info['name']}' başlatılamadı: {e}")
            return False

    # SSE tipi (varsayılan): yerel script dosyası
    script_path = Path(__file__).parent / info["script"]
    if not script_path.exists():
        logger.error(f"Script bulunamadı: {script_path}")
        return False

    try:
        log_dir = Path(__file__).parent / "logs"
        log_dir.mkdir(exist_ok=True)
        log_file = log_dir / f"{name}.log"
        log_file_handle = open(log_file, "w", encoding="utf-8")
        
        proc = subprocess.Popen(
            [sys.executable, str(script_path)],
            stdout=log_file_handle,
            stderr=log_file_handle,
        )
        _processes[name] = proc
        logger.info(f"✓ '{info['name']}' başlatıldı (PID: {proc.pid}, Port: {info['port']}, Log: logs/{name}.log)")
        return True
    except Exception as e:
        logger.error(f"'{info['name']}' başlatılamadı: {e}")
        return False


def stop_server(name: str) -> bool:
    """Stop a specific MCP server."""
    proc = _processes.get(name)
    if not proc or proc.poll() is not None:
        logger.info(f"'{name}' zaten durmuş.")
        return True

    try:
        proc.terminate()
        proc.wait(timeout=5)
        logger.info(f"✓ '{MCP_SERVERS[name]['name']}' durduruldu.")
        del _processes[name]
        return True
    except Exception as e:
        logger.error(f"Durdurma hatası: {e}")
        try:
            proc.kill()
        except:
            pass
        return False


def check_server(name: str) -> dict:
    """Check if a specific MCP server is running and responding."""
    info = MCP_SERVERS.get(name)
    if not info:
        return {"name": name, "running": False, "status": "unknown"}

    server_type = info.get("type", "sse")

    if server_type == "stdio":
        proc = _processes.get(name)
        running = proc is not None and proc.poll() is None
        return {
            "name": name,
            "port": 0,
            "running": running,
            "port_open": False,
            "status": "aktif" if running else "durduruldu",
            "type": "stdio",
        }

    port_open = False
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        port_open = s.connect_ex(("127.0.0.1", info["port"])) == 0
        s.close()
    except:
        pass

    running = port_open

    return {
        "name": name,
        "port": info["port"],
        "running": running,
        "port_open": port_open,
        "status": "aktif" if port_open else "durduruldu",
    }


def start_all():
    """Start all MCP servers."""
    logger.info("=" * 50)
    logger.info("Tüm MCP sunucuları başlatılıyor...")
    logger.info("=" * 50)
    for name in MCP_SERVERS:
        start_server(name)


def stop_all():
    """Stop all MCP servers."""
    logger.info("Tüm MCP sunucuları durduruluyor...")
    for name in list(_processes.keys()):
        stop_server(name)


def status_all() -> list:
    """Get status of all MCP servers."""
    results = []
    for name in MCP_SERVERS:
        status = check_server(name)
        results.append(status)
    return results


def print_status():
    """Print a formatted status table."""
    results = status_all()
    logger.info("")
    logger.info(f"{'Sunucu':<30} {'Port':<8} {'Durum':<15}")
    logger.info("-" * 55)
    for r in results:
        durum_icon = "🟢" if r["status"] == "aktif" else ("🟡" if r["status"] == "baslatildi" else "🔴")
        port_str = str(r.get("port", "")) if r.get("port") else "-"
        logger.info(f"{durum_icon} {r['name']:<28} {port_str:<8} {r['status']:<15}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ALTU MCP Sunucu Yöneticisi")
    parser.add_argument("komut", nargs="?", choices=["start", "stop", "restart", "status"], default="status")
    parser.add_argument("--server", "-s", help="Sunucu adı (hepsi için boş bırakın)")

    args = parser.parse_args()

    if args.komut == "start":
        if args.server:
            start_server(args.server)
        else:
            start_all()
        print_status()

    elif args.komut == "stop":
        if args.server:
            stop_server(args.server)
        else:
            stop_all()
        print_status()

    elif args.komut == "restart":
        if args.server:
            stop_server(args.server)
            time.sleep(1)
            start_server(args.server)
        else:
            stop_all()
            time.sleep(1)
            start_all()
        print_status()

    else:
        print_status()