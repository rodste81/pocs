/*
 * CLCL
 *
 * fmt_metafile.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

#include "fmt_metafile_view.h"
#include "..\CLCLPlugin.h"

#include "resource.h"

/* Define */

/* Global Variables */
HINSTANCE hInst;

static HICON meta_icon;
static HWND hMetaWnd;

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
 * get_format_header - 内部形式を処理するヘッダの取得
 */
__declspec(dllexport) BOOL CALLBACK get_format_header(const HWND hWnd, const int index, FORMAT_GET_INFO *fgi)
{
	switch (index) {
	case 0:
		lstrcpy(fgi->format_name, TEXT("METAFILE PICTURE, ENHANCED METAFILE"));
		lstrcpy(fgi->func_header, TEXT("meta_"));
		lstrcpy(fgi->comment, TEXT("Meta file"));
		return TRUE;

	case 1:
		return FALSE;
	}
	return FALSE;
}

/*
 * meta_show_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK meta_show_property(const HWND hWnd)
{
	return FALSE;
}

/*
 * meta_initialize - 初期化
 */
__declspec(dllexport) BOOL CALLBACK meta_initialize(void)
{
	if (meta_icon == NULL) {
		meta_icon = LoadImage(hInst, MAKEINTRESOURCE(IDI_ICON_METAFILE), IMAGE_ICON, 16, 16, 0);
	}
	metaview_regist(hInst);
	return TRUE;
}

/*
 * meta_get_icon - 形式用のアイコンを取得
 */
__declspec(dllexport) HICON CALLBACK meta_get_icon(const int icon_size, BOOL *free_icon)
{
	*free_icon = FALSE;
	return meta_icon;
}

/*
 * meta_free - 終了処理
 */
__declspec(dllexport) BOOL CALLBACK meta_free(void)
{
	if (meta_icon != NULL) {
		DestroyIcon(meta_icon);
		meta_icon = NULL;
	}
	return TRUE;
}

/*
 * meta_initialize_item - アイテム情報の初期化
 */
__declspec(dllexport) BOOL CALLBACK meta_initialize_item(DATA_INFO *di, const BOOL set_init_data)
{
	return FALSE;
}

/*
 * meta_copy_data - データのコピー
 */
__declspec(dllexport) HANDLE CALLBACK meta_copy_data(const TCHAR *format_name, const HANDLE data, DWORD *ret_size)
{
	return NULL;
}

/*
 * meta_data_to_bytes - データをバイト列に変換
 */
__declspec(dllexport) BYTE* CALLBACK meta_data_to_bytes(const DATA_INFO *di, DWORD *ret_size)
{
	return NULL;
}

/*
 * meta_bytes_to_data - バイト列をデータに変換
 */
__declspec(dllexport) HANDLE CALLBACK meta_bytes_to_data(const TCHAR *format_name, const BYTE *data, DWORD *size)
{
	return NULL;
}

/*
 * meta_get_file_info - コモンダイアログ情報の取得
 */
__declspec(dllexport) int CALLBACK meta_get_file_info(const TCHAR *format_name, const DATA_INFO *di, OPENFILENAME *of, const BOOL mode)
{
	if (lstrcmpi(format_name, TEXT("METAFILE PICTURE")) == 0) {
		of->lpstrFilter = TEXT("*.wmf\0*.wmf\0*.*\0*.*\0\0");
		of->nFilterIndex = 1;
		of->lpstrDefExt = TEXT("wmf");
		return 1;
	} else if (lstrcmpi(format_name, TEXT("ENHANCED METAFILE")) == 0) {
		of->lpstrFilter = TEXT("*.emf\0*.emf\0*.*\0*.*\0\0");
		of->nFilterIndex = 1;
		of->lpstrDefExt = TEXT("emf");
		return 1;
	}
	return 0;
}

/*
 * meta_data_to_file - データをファイルに保存
 */
__declspec(dllexport) BOOL CALLBACK meta_data_to_file(DATA_INFO *di, const TCHAR *file_name, const int filter_index, TCHAR *err_str)
{
	return FALSE;
}

/*
 * meta_file_to_data - ファイルからデータを作成
 */
__declspec(dllexport) HANDLE CALLBACK meta_file_to_data(const TCHAR *file_name, const TCHAR *format_name, DWORD *ret_size, TCHAR *err_str)
{
	return NULL;
}

/*
 * meta_free_data - データの解放
 */
__declspec(dllexport) BOOL CALLBACK meta_free_data(const TCHAR *format_name, HANDLE data)
{
	return FALSE;
}

/*
 * meta_free_item - アイテム情報の解放
 */
__declspec(dllexport) BOOL CALLBACK meta_free_item(DATA_INFO *di)
{
	return FALSE;
}

/*
 * meta_get_menu_title - メニュータイトルの取得
 */
__declspec(dllexport) BOOL CALLBACK meta_get_menu_title(DATA_INFO *di)
{
	return FALSE;
}

/*
 * meta_get_menu_icon - メニュー用アイコンの取得
 */
__declspec(dllexport) BOOL CALLBACK meta_get_menu_icon(DATA_INFO *di, const int icon_size)
{
	di->menu_icon = meta_icon;
	di->free_icon = FALSE;
	return TRUE;
}

/*
 * meta_get_menu_bitmap - メニュー用ビットマップの取得
 */
__declspec(dllexport) BOOL CALLBACK meta_get_menu_bitmap(DATA_INFO *di, const int width, const int height)
{
	HDC hdc;
	HDC to_dc;
	HBITMAP old_to_hbmp;
	HBRUSH draw_brush;
	RECT draw_rect;
	BYTE *mem;

	if (di->data == NULL) {
		return FALSE;
	}

	// 描画情報の作成
	hdc = GetDC(NULL);
	to_dc = CreateCompatibleDC(hdc);
	di->menu_bitmap = CreateCompatibleBitmap(hdc, width, height);
	old_to_hbmp = SelectObject(to_dc, di->menu_bitmap);
	ReleaseDC(NULL, hdc);

	// 描画の初期化
	SetRect(&draw_rect, 0, 0, width, height);
	draw_brush = CreateSolidBrush(GetSysColor(COLOR_WINDOW));
	FillRect(to_dc, &draw_rect, draw_brush);
	DeleteObject(draw_brush);

	if (lstrcmpi(di->format_name, TEXT("METAFILE PICTURE")) == 0) {
		// メタファイルの描画
		if ((mem = GlobalLock(di->data)) != NULL) {
			SetMapMode(to_dc, ((METAFILEPICT *)mem)->mm);
			SetWindowExtEx(to_dc, width, height, NULL);
			SetViewportExtEx(to_dc, width, height, NULL);
			PlayMetaFile(to_dc, ((METAFILEPICT *)mem)->hMF);
			GlobalUnlock(di->data);
		}
	} else {
		// 拡張メタファイルの描画
		PlayEnhMetaFile(to_dc, (HENHMETAFILE)di->data, &draw_rect);
	}
	SelectObject(to_dc, old_to_hbmp);
	DeleteDC(to_dc);

	di->free_bitmap = TRUE;
	return TRUE;
}

/*
 * meta_get_tooltip_text - メニュー用ツールチップテキスト
 */
__declspec(dllexport) TCHAR* CALLBACK meta_get_tooltip_text(DATA_INFO *di)
{
	return NULL;
}

/*
 * meta_window_create - データ表示ウィンドウの作成
 */
__declspec(dllexport) HWND CALLBACK meta_window_create(const HWND parent_wnd)
{
	if (hMetaWnd == NULL) {
		hMetaWnd = metaview_create(hInst, parent_wnd, 0);
	}
	return hMetaWnd;
}

/*
 * meta_window_destroy - データ表示ウィンドウの破棄
 */
__declspec(dllexport) BOOL CALLBACK meta_window_destroy(const HWND hWnd)
{
	hMetaWnd = NULL;
	return TRUE;
}

/*
 * meta_window_show_data - データの表示
 */
__declspec(dllexport) BOOL CALLBACK meta_window_show_data(const HWND hWnd, DATA_INFO *di, const BOOL lock)
{
	SendMessage(hWnd, WM_SET_METADATA, 0, (LPARAM)di);
	return FALSE;
}

/*
 * meta_window_save_data - データの保存
 */
__declspec(dllexport) BOOL CALLBACK meta_window_save_data(const HWND hWnd, DATA_INFO *di)
{
	return FALSE;
}

/*
 * meta_window_hide_data - データの非表示
 */
__declspec(dllexport) BOOL CALLBACK meta_window_hide_data(const HWND hWnd, DATA_INFO *di)
{
	SendMessage(hWnd, WM_SET_METADATA, 0, 0);
	return FALSE;
}
/* End of source */
