/*
 * CLCL
 *
 * fmt_Text.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE
#include <richedit.h>

#include "..\CLCLPlugin.h"
#include "fmt_text_view.h"
#include "Memory.h"
#include "String.h"
#include "Message.h"

#include "resource.h"

/* Define */
#define TOOLTIP_SIZE			1024

/* Global Variables */
HINSTANCE hInst;

static HANDLE hLib;
static HICON txt_icon;
static HWND hTxtWnd;

/* Local Function Prototypes */

/*
 * DllMain - メイン
 */
int WINAPI DllMain(HINSTANCE hInstance, DWORD fdwReason, PVOID pvReserved)
{
	switch (fdwReason) {
	case DLL_PROCESS_ATTACH:
		hInst = hInstance;
		break;

	case DLL_PROCESS_DETACH:
		break;

	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
		break;
	}
	return TRUE;
}

/*
 * file_read_buf - ファイルを読み込む
 */
BYTE *file_read_buf(const TCHAR *path, DWORD *ret_size, TCHAR *err_str)
{
	HANDLE hFile;
	DWORD size;
	DWORD ret;
	BYTE *buf;

	// ファイルを開く
	hFile = CreateFile(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile == NULL || hFile == (HANDLE)-1) {
		message_get_error(GetLastError(), err_str);
		return NULL;
	}
	size = GetFileSize(hFile, NULL);
	if (size == 0xFFFFFFFF) {
		message_get_error(GetLastError(), err_str);
		CloseHandle(hFile);
		return NULL;
	}

	buf = (BYTE *)mem_alloc(size + 1);
	if (buf == NULL) {
		message_get_error(GetLastError(), err_str);
		CloseHandle(hFile);
		return NULL;
	}

	// ファイルを読みこむ
	if (ReadFile(hFile, buf, size, &ret, NULL) == FALSE) {
		message_get_error(GetLastError(), err_str);
		mem_free(&buf);
		CloseHandle(hFile);
		return NULL;
	}
	CloseHandle(hFile);

	if (ret_size != NULL) {
		*ret_size = size;
	}
	return buf;
}

/*
 * file_write_buf - ファイルに書き込む
 */
BOOL file_write_buf(const TCHAR *path, const BYTE *data, const DWORD size, TCHAR *err_str)
{
	HANDLE hFile;
	DWORD ret;

	// ファイルを開く
	hFile = CreateFile(path, GENERIC_READ | GENERIC_WRITE, 0, 0, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
	if (hFile == NULL || hFile == (HANDLE)-1) {
		message_get_error(GetLastError(), err_str);
		return FALSE;
	}
	// ファイルの書き込み
	if (WriteFile(hFile, data, size, &ret, NULL) == FALSE) {
		message_get_error(GetLastError(), err_str);
		CloseHandle(hFile);
		return FALSE;
	}
	CloseHandle(hFile);
	return TRUE;
}

/*
 * get_format_header - 内部形式を処理するヘッダの取得
 */
__declspec(dllexport) BOOL CALLBACK get_format_header(const HWND hWnd, const int index, FORMAT_GET_INFO *fgi)
{
	switch (index) {
	case 0:
		lstrcpy(fgi->format_name, TEXT("TEXT"));
		lstrcpy(fgi->func_header, TEXT("text_"));
		lstrcpy(fgi->comment, TEXT("テキスト"));
		return TRUE;
	}
	return FALSE;
}

/*
 * text_show_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK text_show_property(const HWND hWnd)
{
	return FALSE;
}

/*
 * text_initialize - 初期化
 */
__declspec(dllexport) BOOL CALLBACK text_initialize(void)
{
	if (hLib == NULL) {
		hLib = LoadLibrary(TEXT("RICHED32.DLL"));
	}
	if (txt_icon == NULL) {
		txt_icon = LoadImage(hInst, MAKEINTRESOURCE(IDI_ICON_TEXT), IMAGE_ICON, 16, 16, 0);
	}
	txtview_regist(hInst);
	return TRUE;
}

/*
 * text_get_icon - 形式用のアイコンを取得
 */
__declspec(dllexport) HICON CALLBACK text_get_icon(const int icon_size, BOOL *free_icon)
{
	return LoadImage(hInst, MAKEINTRESOURCE(IDI_ICON_TEXT), IMAGE_ICON, icon_size, icon_size, 0);
}

/*
 * text_free - 終了処理
 */
__declspec(dllexport) BOOL CALLBACK text_free(void)
{
	if (hLib != NULL) {
		FreeLibrary(hLib);
		hLib = NULL;
	}
	if (txt_icon != NULL) {
		DestroyIcon(txt_icon);
		txt_icon = NULL;
	}
	return TRUE;
}

/*
 * text_initialize_item - アイテム情報の初期化
 */
__declspec(dllexport) BOOL CALLBACK text_initialize_item(DATA_INFO *di, const BOOL set_init_data)
{
	return FALSE;
}

/*
 * text_copy_data - データのコピー
 */
__declspec(dllexport) HANDLE CALLBACK text_copy_data(const TCHAR *format_name, const HANDLE data, DWORD *ret_size)
{
	HANDLE ret;
	BYTE *from_mem, *to_mem;
	BYTE *p;

	// チェック
	if (data == NULL || IsBadReadPtr(data, 1) == TRUE) {
		return NULL;
	}
	// サイズ取得
	if ((*ret_size = GlobalSize(data)) == 0) {
		return NULL;
	}
	// コピー元ロック
	if ((from_mem = GlobalLock(data)) == NULL) {
		return NULL;
	}

	for (p = from_mem; *ret_size > (DWORD)(p - from_mem) && *p != '\0'; p++)
		;
	*ret_size = p - from_mem + 1;

	// コピー先確保
	if ((ret = GlobalAlloc(GHND, *ret_size)) == NULL) {
		GlobalUnlock(data);
		return NULL;
	}
	// コピー先ロック
	if ((to_mem = GlobalLock(ret)) == NULL) {
		GlobalFree(ret);
		GlobalUnlock(data);
		return NULL;
	}

	// コピー
	CopyMemory(to_mem, from_mem, *ret_size);
	*(to_mem + *ret_size - 1) = '\0';

	// ロック解除
	GlobalUnlock(ret);
	GlobalUnlock(data);
	return ret;
}

/*
 * text_data_to_bytes - データをバイト列に変換
 */
__declspec(dllexport) BYTE* CALLBACK text_data_to_bytes(const DATA_INFO *di, DWORD *ret_size)
{
	BYTE *mem;
	BYTE *ret;

	if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
		return NULL;
	}
	ret = mem_alloc(di->size);
	if (ret == NULL) {
		GlobalUnlock(di->data);
		return NULL;
	}
	CopyMemory(ret, mem, di->size);
	if (ret_size != NULL) {
		*ret_size = di->size;
	}
	GlobalUnlock(di->data);
	return ret;
}

/*
 * text_bytes_to_data - バイト列をデータに変換
 */
__declspec(dllexport) HANDLE CALLBACK text_bytes_to_data(const TCHAR *format_name, const BYTE *data, DWORD *size)
{
	BYTE *ret;
	BYTE *mem;

	// コピー先確保
	if (data == NULL || (ret = GlobalAlloc(GHND, *size)) == NULL) {
		return NULL;
	}
	// コピー先ロック
	if ((mem = GlobalLock(ret)) == NULL) {
		GlobalFree(ret);
		return NULL;
	}
	// コピー
	CopyMemory(mem, data, *size);
	// ロック解除
	GlobalUnlock(ret);
	return ret;
}

/*
 * text_get_file_info - コモンダイアログ情報の取得
 */
__declspec(dllexport) int CALLBACK text_get_file_info(const TCHAR *format_name, const DATA_INFO *di, OPENFILENAME *of, const BOOL mode)
{
	of->lpstrFilter = TEXT("*.txt\0*.txt\0*.*\0*.*\0\0");
	of->nFilterIndex = 1;
	of->lpstrDefExt = TEXT("txt");
	return 1;
}

/*
 * text_data_to_file - データをファイルに保存
 */
__declspec(dllexport) BOOL CALLBACK text_data_to_file(DATA_INFO *di, const TCHAR *file_name, const int filter_index, TCHAR *err_str)
{
	BYTE *tmp;

	if (di->data == NULL) {
		return FALSE;
	}
	if ((tmp = GlobalLock(di->data)) == NULL) {
		message_get_error(GetLastError(), err_str);
		return FALSE;
	}
	// ファイルに書き込む
	if (file_write_buf(file_name, tmp, di->size - 1, err_str) == FALSE) {
		GlobalUnlock(di->data);
		return FALSE;
	}
	GlobalUnlock(di->data);
	return TRUE;
}

/*
 * text_file_to_data - ファイルからデータを作成
 */
__declspec(dllexport) HANDLE CALLBACK text_file_to_data(const TCHAR *file_name, const TCHAR *format_name, DWORD *ret_size, TCHAR *err_str)
{
	HANDLE ret = NULL;
	BYTE *data;
	BYTE *mem;
	DWORD size;

	// ファイルの読み込み
	data = file_read_buf(file_name, &size, err_str);
	if (data == NULL) {
		return NULL;
	}
	// コピー先確保
	if ((ret = GlobalAlloc(GHND, size + 1)) == NULL) {
		message_get_error(GetLastError(), err_str);
		mem_free(&data);
		return NULL;
	}
	// コピー先ロック
	if ((mem = GlobalLock(ret)) == NULL) {
		message_get_error(GetLastError(), err_str);
		GlobalFree(ret);
		mem_free(&data);
		return NULL;
	}
	// コピー
	CopyMemory(mem, data, size);
	*(mem + size) = '\0';
	if (ret_size != NULL) {
		*ret_size = size;
	}
	// ロック解除
	GlobalUnlock(ret);
	mem_free(&data);
	return ret;
}

/*
 * text_free_data - データの解放
 */
__declspec(dllexport) BOOL CALLBACK text_free_data(const TCHAR *format_name, HANDLE data)
{
	if (data == NULL) {
		return TRUE;
	}
	if (GlobalFree((HGLOBAL)data) != NULL) {
		return FALSE;
	}
	return TRUE;
}

/*
 * text_free_item - アイテム情報の解放
 */
__declspec(dllexport) BOOL CALLBACK text_free_item(DATA_INFO *di)
{
	return FALSE;
}

/*
 * text_get_menu_title - メニュータイトルの取得
 */
__declspec(dllexport) BOOL CALLBACK text_get_menu_title(DATA_INFO *di)
{
	TCHAR buf[BUF_SIZE];
	TCHAR tmp[BUF_SIZE];
	BYTE *mem;
	TCHAR *p, *r;

	if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
		return FALSE;
	}
	if (*mem == '\0') {
		GlobalUnlock(di->data);
		return TRUE;
	}

	// メニュー用文字列
	char_to_tchar(mem, buf, BUF_SIZE - 1);
	GlobalUnlock(di->data);

	lstrcpy(tmp, buf);
	r = buf;
	for (p = tmp; *p == TEXT(' ') || *p == TEXT('\t') || *p == TEXT('\r') || *p == TEXT('\n'); p++)
		;
	while ((r - buf) < (BUF_SIZE - 4) && *p != TEXT('\0')) {
		if (*p == TEXT('\r') || *p == TEXT('\n')) {
			lstrcpy(r, TEXT("..."));
			r += 3;
			break;
		}
		switch (*p) {
		case TEXT(' '):
		case TEXT('\t'):
			(*r++) = TEXT(' ');
			for (; *p == TEXT(' ') || *p == TEXT('\t'); p++)
				;
			break;

		case TEXT('&'):
			(*r++) = TEXT('&');
			(*r++) = *(p++);
			break;

		default:
			(*r++) = *(p++);
			break;
		}
	}
	*r = TEXT('\0');

	if (*buf != TEXT('\0')) {
		di->menu_title = alloc_copy(buf);
		di->free_title = TRUE;
	}
	return TRUE;
}

/*
 * text_get_menu_icon - メニュー用アイコンの取得
 */
__declspec(dllexport) BOOL CALLBACK text_get_menu_icon(DATA_INFO *di, const int icon_size)
{
	di->menu_icon = txt_icon;
	di->free_icon = FALSE;
	return TRUE;
}

/*
 * text_get_menu_bitmap - メニュー用ビットマップの取得
 */
__declspec(dllexport) BOOL CALLBACK text_get_menu_bitmap(DATA_INFO *di, const int width, const int height)
{
	return FALSE;
}

/*
 * text_get_tooltip_text - メニュー用ツールチップテキスト
 */
__declspec(dllexport) TCHAR* CALLBACK text_get_tooltip_text(DATA_INFO *di)
{
	TCHAR *ret;
	BYTE *mem;

	if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
		return NULL;
	}
	if (*mem == '\0') {
		GlobalUnlock(di->data);
		return NULL;
	}
	ret = mem_alloc(sizeof(TCHAR) * TOOLTIP_SIZE);
	if (ret == NULL) {
		GlobalUnlock(di->data);
		return NULL;
	}
	char_to_tchar(mem, ret, TOOLTIP_SIZE - 1);
	GlobalUnlock(di->data);
	return ret;
}

/*
 * text_window_create - データ表示ウィンドウの作成
 */
__declspec(dllexport) HWND CALLBACK text_window_create(const HWND parent_wnd)
{
	if (hTxtWnd == NULL) {
		hTxtWnd = txtview_create(hInst, parent_wnd, 0);
	}
	return hTxtWnd;
}

/*
 * text_window_destroy - データ表示ウィンドウの破棄
 */
__declspec(dllexport) BOOL CALLBACK text_window_destroy(const HWND hWnd)
{
	hTxtWnd = NULL;
	return TRUE;
}

/*
 * text_window_show_data - データの表示
 */
__declspec(dllexport) BOOL CALLBACK text_window_show_data(const HWND hWnd, DATA_INFO *di, const BOOL lock)
{
	BYTE *mem;
#ifdef UNICODE
	TCHAR *buf;
#endif

	if (di->data == NULL) {
		SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)TEXT(""));
	} else {
		if ((mem = GlobalLock(di->data)) == NULL) {
			return FALSE;
		}
#ifdef UNICODE
		buf = alloc_char_to_tchar(mem);
		SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)buf);
		mem_free(&buf);
#else
		SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)mem);
#endif
		GlobalUnlock(di->data);
	}

	if (lock == TRUE) {
		SendMessage(hWnd, EM_SETOPTIONS, ECOOP_OR, ECO_READONLY);
	} else {
		SendMessage(hWnd, EM_SETOPTIONS, ECOOP_AND, ~ECO_READONLY);
	}
	SendMessage(hWnd, EM_SETMODIFY, FALSE, 0);
	return TRUE;
}

/*
 * text_window_save_data - データの保存
 */
__declspec(dllexport) BOOL CALLBACK text_window_save_data(const HWND hWnd, DATA_INFO *di)
{
	HANDLE data;
	BYTE *to_mem;
	DWORD size;
#ifdef UNICODE
	TCHAR *buf;
#endif

	if (hWnd == NULL ||
		(SendMessage(hWnd, EM_GETOPTIONS, 0, 0) & ECO_READONLY) ||
		SendMessage(hWnd, EM_GETMODIFY, 0, 0) == FALSE) {
		return FALSE;
	}
	if (di->data != NULL) {
		GlobalFree(di->data);
		di->data = NULL;
		di->size = 0;
	}
	size = SendMessage(hWnd, WM_GETTEXTLENGTH, 0, 0);
#ifdef UNICODE
	// 現在表示されている内容の取得
	if ((buf = mem_alloc(sizeof(TCHAR) * (size + 1))) == NULL) {
		return FALSE;
	}
	SendMessage(hWnd, WM_GETTEXT, size + 1, (LPARAM)buf);

	// データの作成
	if ((data = GlobalAlloc(GHND, size + 1)) == NULL) {
		mem_free(&buf);
		return FALSE;
	}
	if ((to_mem = GlobalLock(data)) == NULL) {
		GlobalFree(data);
		mem_free(&buf);
		return FALSE;
	}
	tchar_to_char(buf, to_mem, size);
	GlobalUnlock(data);
	mem_free(&buf);
#else
	// データの作成
	if ((data = GlobalAlloc(GHND, size + 1)) == NULL) {
		return FALSE;
	}
	if ((to_mem = GlobalLock(data)) == NULL) {
		GlobalFree(data);
		return FALSE;
	}
	SendMessage(hWnd, WM_GETTEXT, size + 1, (LPARAM)to_mem);
	GlobalUnlock(data);
#endif
	// 新しいデータを設定
	di->data = data;
	di->size = size + 1;

	SendMessage(hWnd, EM_SETMODIFY, FALSE, 0);
	return TRUE;
}

/*
 * text_window_hide_data - データの非表示
 */
__declspec(dllexport) BOOL CALLBACK text_window_hide_data(const HWND hWnd, DATA_INFO *di)
{
	SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)TEXT(""));
	return TRUE;
}
/* End of source */
