import sys
import os
import time
import json
import threading
import requests
import logging

# GUI Libraries
try:
    import customtkinter as ctk
    HAS_CUSTOMTKINTER = True
except ImportError:
    import tkinter as tk
    from tkinter import ttk, messagebox
    HAS_CUSTOMTKINTER = False

logger = logging.getLogger(__name__)

# Ensure python-backend folder is in path to import scraper
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from uyap_scraper_selenium import sync_uyap_selenium

if HAS_CUSTOMTKINTER:
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    
    class UyapSyncApp(ctk.CTk):
        def __init__(self):
            super().__init__()
            self.title("⚖️ ALTU UYAP Masaüstü Güncelleme İstemcisi")
            self.geometry("580x520")
            self.resizable(False, False)
            
            self.api_url = "http://localhost:3001"
            self.running = False
            self.create_widgets()
            
        def create_widgets(self):
            # Title Banner
            self.title_lbl = ctk.CTkLabel(
                self, 
                text="⚖️ ALTU UYAP EŞİTLEME SİSTEMİ", 
                font=ctk.CTkFont(size=18, weight="bold"),
                text_color="#3b82f6"
            )
            self.title_lbl.pack(pady=(20, 10))
            
            self.desc_lbl = ctk.CTkLabel(
                self, 
                text="T-HOS tarzı otomatik dava ve duruşma eşitleme aracı.", 
                font=ctk.CTkFont(size=12, slant="italic"),
                text_color="#94a3b8"
            )
            self.desc_lbl.pack(pady=(0, 15))
            
            # Form Container
            self.form_frame = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=12)
            self.form_frame.pack(fill="x", padx=30, pady=5)
            
            # API URL
            self.api_lbl = ctk.CTkLabel(self.form_frame, text="Sistem Panel URL:", font=ctk.CTkFont(size=11, weight="bold"))
            self.api_lbl.grid(row=0, column=0, padx=15, pady=(15, 5), sticky="w")
            self.api_entry = ctk.CTkEntry(self.form_frame, width=320, placeholder_text="http://localhost:3001")
            self.api_entry.insert(0, self.api_url)
            self.api_entry.grid(row=0, column=1, padx=15, pady=(15, 5), sticky="e")
            
            # T.C. Kimlik
            self.tc_lbl = ctk.CTkLabel(self.form_frame, text="T.C. Kimlik No:", font=ctk.CTkFont(size=11, weight="bold"))
            self.tc_lbl.grid(row=1, column=0, padx=15, pady=5, sticky="w")
            self.tc_entry = ctk.CTkEntry(self.form_frame, width=320, placeholder_text="11 haneli T.C. No")
            self.tc_entry.grid(row=1, column=1, padx=15, pady=5, sticky="e")
            
            # Password
            self.pass_lbl = ctk.CTkLabel(self.form_frame, text="e-Devlet Şifresi:", font=ctk.CTkFont(size=11, weight="bold"))
            self.pass_lbl.grid(row=2, column=0, padx=15, pady=5, sticky="w")
            self.pass_entry = ctk.CTkEntry(self.form_frame, show="*", width=320, placeholder_text="Otomatik giriş için şifreniz")
            self.pass_entry.grid(row=2, column=1, padx=15, pady=5, sticky="e")
            
            # Login Method
            self.method_lbl = ctk.CTkLabel(self.form_frame, text="Giriş Yöntemi:", font=ctk.CTkFont(size=11, weight="bold"))
            self.method_lbl.grid(row=3, column=0, padx=15, pady=(5, 15), sticky="w")
            self.method_combo = ctk.CTkComboBox(
                self.form_frame, 
                values=["e-Devlet Şifresi ile Otomatik", "E-İmza ile (PIN Girişli)"],
                width=320
            )
            self.method_combo.grid(row=3, column=1, padx=15, pady=(5, 15), sticky="e")
            
            # Status Box
            self.status_frame = ctk.CTkFrame(self, fg_color="#0f172a", corner_radius=10, border_width=1, border_color="#334155")
            self.status_frame.pack(fill="both", expand=True, padx=30, pady=15)
            
            self.status_header = ctk.CTkLabel(
                self.status_frame, 
                text="⚡ CANLI OTOMASYON GÜNLÜĞÜ", 
                font=ctk.CTkFont(family="Courier", size=10, weight="bold"),
                text_color="#64748b"
            )
            self.status_header.pack(pady=(8, 2), padx=15, anchor="w")
            
            self.log_text = ctk.CTkLabel(
                self.status_frame, 
                text="Sistem Hazır. Eşitlemeyi başlatmak için aşağıdaki butona tıklayın.", 
                font=ctk.CTkFont(family="Courier", size=11),
                text_color="#38bdf8",
                wraplength=480,
                justify="left"
            )
            self.log_text.pack(pady=10, padx=15, fill="both", expand=True)
            
            # Progress Bar
            self.progress_bar = ctk.CTkProgressBar(self, width=520, height=8)
            self.progress_bar.set(0)
            self.progress_bar.pack(pady=5)
            
            # Action Button
            self.sync_btn = ctk.CTkButton(
                self, 
                text="🔄 UYAP'I GÜNCELLE VE SENKRONİZE ET", 
                font=ctk.CTkFont(size=13, weight="bold"),
                fg_color="#2563eb",
                hover_color="#1d4ed8",
                height=45,
                corner_radius=10,
                command=self.start_sync_thread
            )
            self.sync_btn.pack(pady=(10, 20), padx=30, fill="x")
            
        def log(self, step: str, percentage: int, detail: str = "", error: str = ""):
            self.progress_bar.set(percentage / 100.0)
            
            log_msg = f"> {step.upper()}\n"
            if detail:
                log_msg += f"Detay: {detail}\n"
            if error:
                log_msg += f"Hata: {error}\n"
                
            self.log_text.configure(text=log_msg)
            
            if error:
                self.log_text.configure(text_color="#ef4444")
            elif percentage == 100:
                self.log_text.configure(text_color="#10b981")
            else:
                self.log_text.configure(text_color="#38bdf8")
                
            self.update_idletasks()
            
        def start_sync_thread(self):
            if self.running:
                return
            self.running = True
            self.sync_btn.configure(state="disabled", fg_color="#64748b", text="⏳ EŞİTLEME SÜRÜYOR...")
            threading.Thread(target=self.run_sync, daemon=True).start()
            
        def run_sync(self):
            tc = self.tc_entry.get().strip()
            password = self.pass_entry.get().strip()
            api = self.api_entry.get().strip()
            method_selection = self.method_combo.get()
            
            login_method = "edevlet" if "e-Devlet" in method_selection else "eimza"
            
            if not tc:
                ctk.CTkMessageBox.show_error("Hata", "Lütfen T.C. Kimlik numaranızı girin.")
                self.reset_btn()
                return
                
            if login_method == "edevlet" and not password:
                ctk.CTkMessageBox.show_error("Hata", "e-Devlet ile otomatik giriş için şifrenizi girin.")
                self.reset_btn()
                return
                
            def progress_callback(status_dict):
                self.after(0, self.log, 
                           status_dict.get("adim", ""), 
                           status_dict.get("yuzde", 0), 
                           status_dict.get("detay", ""), 
                           status_dict.get("hata", ""))
                
            success = sync_uyap_selenium(
                tc=tc,
                password=password,
                login_method=login_method,
                callback_progress=progress_callback,
                api_url=api
            )
            
            if success:
                self.after(0, lambda: ctk.CTkLabel(self, text="Eşitleme Tamamlandı!").destroy()) # Dummy update to trigger main loop
                self.after(0, lambda: messagebox.showinfo("Başarılı", "UYAP Güncelleme Başarıyla Tamamlandı!"))
            else:
                self.after(0, lambda: messagebox.showerror("Hata", "UYAP güncellemesi başarısız oldu."))
                
            self.after(0, self.reset_btn)
            
        def reset_btn(self):
            self.running = False
            self.sync_btn.configure(state="normal", fg_color="#2563eb", text="🔄 UYAP'I GÜNCELLE VE SENKRONİZE ET")

else:
    # Standard Tkinter Fallback for compatibility
    class UyapSyncApp:
        def __init__(self, root):
            self.root = root
            self.root.title("⚖️ ALTU UYAP Masaüstü Güncelleme İstemcisi")
            self.root.geometry("520x480")
            self.root.resizable(False, False)
            self.api_url = "http://localhost:3001"
            self.running = False
            self.create_widgets()
            
        def create_widgets(self):
            # Styled Banner
            header_frame = tk.Frame(self.root, bg="#1e293b", height=60)
            header_frame.pack(fill="x")
            header_label = tk.Label(header_frame, text="⚖️ ALTU UYAP EŞİTLEME SİSTEMİ", bg="#1e293b", fg="white", font=("Arial", 12, "bold"))
            header_label.pack(pady=15)
            
            main_frame = ttk.Frame(self.root, padding=20)
            main_frame.pack(fill="both", expand=True)
            
            # Settings Frame
            settings_frame = ttk.LabelFrame(main_frame, text=" Bağlantı ve Kimlik Bilgileri ")
            settings_frame.pack(fill="x", pady=5, ipady=5)
            
            ttk.Label(settings_frame, text="Sistem Panel URL:").grid(row=0, column=0, sticky="w", padx=10, pady=5)
            self.api_entry = ttk.Entry(settings_frame, width=32)
            self.api_entry.insert(0, self.api_url)
            self.api_entry.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
            
            ttk.Label(settings_frame, text="T.C. Kimlik No:").grid(row=1, column=0, sticky="w", padx=10, pady=5)
            self.tc_entry = ttk.Entry(settings_frame, width=32)
            self.tc_entry.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
            
            ttk.Label(settings_frame, text="e-Devlet Şifresi:").grid(row=2, column=0, sticky="w", padx=10, pady=5)
            self.pass_entry = ttk.Entry(settings_frame, show="*", width=32)
            self.pass_entry.grid(row=2, column=1, padx=10, pady=5, sticky="ew")
            
            ttk.Label(settings_frame, text="Giriş Yöntemi:").grid(row=3, column=0, sticky="w", padx=10, pady=5)
            self.method_combo = ttk.Combobox(settings_frame, values=["e-Devlet Şifresi", "E-İmza ile (PIN Girişli)"], state="readonly", width=30)
            self.method_combo.set("e-Devlet Şifresi")
            self.method_combo.grid(row=3, column=1, padx=10, pady=5, sticky="ew")
            
            # Log Panel
            log_frame = ttk.LabelFrame(main_frame, text=" Otomasyon Günlüğü ")
            log_frame.pack(fill="both", expand=True, pady=10)
            
            self.log_label = tk.Label(
                log_frame, 
                text="Sistem hazır. Eşitlemeyi başlatmak için aşağıdaki butona tıklayın.", 
                font=("Courier", 9), 
                fg="#2563eb", 
                bg="white", 
                anchor="nw", 
                justify="left", 
                wraplength=450,
                height=5
            )
            self.log_label.pack(fill="both", expand=True, padx=10, pady=10)
            
            # Progress Bar
            self.progress = ttk.Progressbar(main_frame, orient="horizontal", mode="determinate")
            self.progress.pack(fill="x", pady=5)
            
            # Action Button
            self.sync_btn = tk.Button(
                main_frame, 
                text="🔄 UYAP'I GÜNCELLE VE SENKRONİZE ET", 
                bg="#2563eb", 
                fg="white", 
                font=("Arial", 10, "bold"), 
                height=2,
                command=self.start_sync_thread
            )
            self.sync_btn.pack(fill="x", pady=5)
            
        def log(self, step: str, percentage: int, detail: str = "", error: str = ""):
            self.progress["value"] = percentage
            
            log_msg = f"> {step.upper()}\n"
            if detail:
                log_msg += f"Detay: {detail}\n"
            if error:
                log_msg += f"Hata: {error}\n"
                
            self.log_label.config(text=log_msg)
            if error:
                self.log_label.config(fg="red")
            elif percentage == 100:
                self.log_label.config(fg="green")
            else:
                self.log_label.config(fg="#2563eb")
                
            self.root.update_idletasks()
            
        def start_sync_thread(self):
            if self.running:
                return
            self.running = True
            self.sync_btn.config(state="disabled", bg="#94a3b8", text="EŞİTLEME SÜRÜYOR...")
            threading.Thread(target=self.run_sync, daemon=True).start()
            
        def run_sync(self):
            tc = self.tc_entry.get().strip()
            password = self.pass_entry.get().strip()
            api = self.api_entry.get().strip()
            method_selection = self.method_combo.get()
            
            login_method = "edevlet" if "e-Devlet" in method_selection else "eimza"
            
            if not tc:
                messagebox.showerror("Hata", "Lütfen T.C. Kimlik numaranızı girin.")
                self.reset_btn()
                return
                
            if login_method == "edevlet" and not password:
                messagebox.showerror("Hata", "e-Devlet ile otomatik giriş için şifrenizi girin.")
                self.reset_btn()
                return
                
            def progress_callback(status_dict):
                self.log(
                    status_dict.get("adim", ""), 
                    status_dict.get("yuzde", 0), 
                    status_dict.get("detay", ""), 
                    status_dict.get("hata", "")
                )
                
            success = sync_uyap_selenium(
                tc=tc,
                password=password,
                login_method=login_method,
                callback_progress=progress_callback,
                api_url=api
            )
            
            if success:
                messagebox.showinfo("Başarılı", "UYAP Güncelleme Başarıyla Tamamlandı!")
            else:
                messagebox.showerror("Hata", "UYAP güncellemesi başarısız oldu.")
                
            self.reset_btn()
            
        def reset_btn(self):
            self.running = False
            self.sync_btn.config(state="normal", bg="#2563eb", text="🔄 UYAP'I GÜNCELLE VE SENKRONİZE ET")

if __name__ == "__main__":
    if HAS_CUSTOMTKINTER:
        app = UyapSyncApp()
        app.mainloop()
    else:
        root = tk.Tk()
        app = UyapSyncApp(root)
        root.mainloop()
