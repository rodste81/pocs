/*
 * CLCL
 *
 * fmt_RPA.c
 *
 * Copyright (C) 1996-2019 by Ohno Tomoaki. All rights reserved.
 *		https://www.nakka.com/
 *		nakka@nakka.com
 */

 /* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

#include "..\CLCLPlugin.h"
#include "Memory.h"
#include "String.h"
#include "fmt_RPA_view.h"

#include "resource.h"

/* Define */
#define ToLower(c)				((c >= TEXT('A') && c <= TEXT('Z')) ? (c - TEXT('A') + TEXT('a')) : c)

/* Global Variables */
static HINSTANCE hInst;
static HWND hViewWnd;
static HICON RPA_icon;

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
 * get_xml_string - XML文字列の取得
 */
static BOOL get_xml_string(BYTE* buf, DWORD size, TCHAR* ret)
{
	BYTE* p = buf;
	DWORD index = 0;
	for (; index < size; p++, index++) {
		if (*p == '<' && *(p + 1) == '?') {
			break;
		}
	}
	if (index >= size) {
		return FALSE;
	}
	// UTF-8からUTF-16に変換
	DWORD len = MultiByteToWideChar(CP_UTF8, 0, p, size - index, NULL, 0);
	MultiByteToWideChar(CP_UTF8, 0, p, size - index, ret, len);
	return TRUE;
}

/*
 * str_cmp_ni - ２つの文字列を大文字、小文字を区別しないで比較を行う
 */
static int str_cmp_ni(const TCHAR* buf1, const TCHAR* buf2, const int len)
{
	int i = 0;

	for (; ToLower(*buf1) == ToLower(*buf2) && *buf1 != TEXT('\0') && i < len; i++, buf1++, buf2++);
	return ((i == len) ? 0 : ToLower(*buf1) - ToLower(*buf2));
}

/*
 * get_display_name - DisplayName一覧の取得
 */
static BOOL get_display_name(BYTE* buf, DWORD size, TCHAR* ret)
{
	WCHAR* wbuf;
	if ((wbuf = (WCHAR*)mem_calloc(sizeof(TCHAR) * size)) == NULL) {
		return FALSE;
	}
	if (get_xml_string(buf, size, wbuf) == FALSE) {
		mem_free(&wbuf);
		return FALSE;
	}

	TCHAR* p = wbuf;
	TCHAR* r = ret;
	for (; *p != TEXT('\0'); p++) {
		if (str_cmp_ni(p, TEXT("DisplayName=\""), lstrlen(TEXT("DisplayName=\""))) == 0) {
			p += lstrlen(TEXT("DisplayName=\""));
			for (; *p != TEXT('"') && *p != TEXT('\0'); p++) {
				*(r++) = *p;
			}
			*(r++) = TEXT('\r');
			*(r++) = TEXT('\n');
		}
	}
	*r = TEXT('\0');
	mem_free(&wbuf);
	return TRUE;
}

/*
 * get_format_header - 内部形式を処理するヘッダの取得
 *
 *	引数:
 *		hWnd - 呼び出し元ウィンドウ
 *		index - 取得のインデックス (0～)
 *		fgi - 形式取得情報
 *
 *	戻り値:
 *		TRUE - 次に取得する形式あり
 *		FALSE - 取得の終了
 */
__declspec(dllexport) BOOL CALLBACK get_format_header(const HWND hWnd, const int index, FORMAT_GET_INFO* fgi)
{
	switch (index) {
	case 0:
		lstrcpy(fgi->format_name, TEXT("WorkflowXamlFormat"));
		lstrcpy(fgi->func_header, TEXT("rpa_"));
		lstrcpy(fgi->comment, TEXT("RPAツール用フォーマット"));
		return TRUE;

	case 1:
		return FALSE;
	}
	return FALSE;
}

/*
 * rpa_show_property - プロパティ表示
 *
 *	引数:
 *		hWnd - オプションウィンドウのハンドル
 *
 *	戻り値:
 *		TRUE - プロパティあり
 *		FALSE - プロパティなし
 */
__declspec(dllexport) BOOL CALLBACK rpa_show_property(const HWND hWnd)
{
	return FALSE;
}

/*
 * rpa_initialize - 初期化
 *
 *	引数:
 *		なし
 *
 *	戻り値:
 *		TRUE - 初期化あり
 *		FALSE - 初期化なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_initialize(void)
{
	if (RPA_icon == NULL) {
		RPA_icon = LoadImage(hInst, MAKEINTRESOURCE(IDI_ICON_RPA), IMAGE_ICON, 16, 16, 0);
	}
	register_RPA_view(hInst);
	return TRUE;
}

/*
 * rpa_get_icon - 形式用のアイコンを取得
 *
 *	引数:
 *		icon_size - 取得するアイコンのサイズ
 *		*free_icon - (OUT) TRUE - 解放する、FALSE - 解放しない
 *					 初期値は TRUE になっています。
 *
 *	戻り値:
 *		アイコンのハンドル
 *		NULL の場合はアイコンなし
 *		*free_icon に TRUE を設定するとアイコンのハンドルは本体側で解放されます
 */
__declspec(dllexport) HICON CALLBACK rpa_get_icon(const int icon_size, BOOL* free_icon)
{
	return LoadImage(hInst, MAKEINTRESOURCE(IDI_ICON_RPA), IMAGE_ICON, icon_size, icon_size, 0);
}

/*
 * rpa_free - 終了処理
 *
 *	引数:
 *		なし
 *
 *	戻り値:
 *		TRUE - 終了処理あり
 *		FALSE - 終了処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_free(void)
{
	if (RPA_icon != NULL) {
		DestroyIcon(RPA_icon);
		RPA_icon = NULL;
	}
	return TRUE;
}

/*
 * rpa_initialize_item - アイテム情報の初期化
 *
 *	引数:
 *		di - 初期化するアイテム情報
 *		set_init_data - TRUE の時は di->data と di->size を設定可能です。
 *		                FALSE の時は設定しないでください。
 *
 *	戻り値:
 *		TRUE - 初期化処理あり
 *		FALSE - 初期化処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_initialize_item(DATA_INFO* di, const BOOL set_init_data)
{
	return FALSE;
}

/*
 * rpa_copy_data - データのコピー
 *
 *	引数:
 *		format_name - 形式名
 *		data - コピーするデータ
 *		ret_size - データのサイズ (out)
 *
 *	戻り値:
 *		コピーしたデータ
 *		NULL の場合はコピー処理なし
 */
__declspec(dllexport) HANDLE CALLBACK rpa_copy_data(const TCHAR* format_name, const HANDLE data, DWORD* ret_size)
{
	return NULL;
}

/*
 * rpa_data_to_bytes - データをバイト列に変換
 *
 *	引数:
 *		di - 変換するアイテム情報
 *		ret_size - データのサイズ (out)
 *
 *	戻り値:
 *		変換したバイト列
 *		NULL の場合は変換処理なし
 */
__declspec(dllexport) BYTE* CALLBACK rpa_data_to_bytes(const DATA_INFO* di, DWORD* ret_size)
{
	return NULL;
}

/*
 * rpa_bytes_to_data - バイト列をデータに変換
 *
 *	引数:
 *		format_name - 形式名
 *		data - 変換するバイト列
 *		size - バイト列のサイズ (in/out)
 *		       値を設定するとデータのサイズになります。
 *
 *	戻り値:
 *		変換したデータ
 *		NULL の場合は変換処理なし
 */
__declspec(dllexport) HANDLE CALLBACK rpa_bytes_to_data(const TCHAR* format_name, const BYTE* data, DWORD* size)
{
	return NULL;
}

/*
 * rpa_get_file_info - コモンダイアログ情報の取得
 *
 *	引数:
 *		format_name - 形式名
 *		di - アイテム情報 (modeがTRUEの場合は NULL)
 *		of - コモンダイアログのファイル情報
 *		mode - TRUE - open、FALSE - save
 *
 *	戻り値:
 *		-1 - コモンダイアログを表示しない
 *		0 - 未設定
 *		1 - 設定済み
 */
__declspec(dllexport) int CALLBACK rpa_get_file_info(const TCHAR* format_name, const DATA_INFO* di, OPENFILENAME* of, const BOOL mode)
{
	return 0;
}

/*
 * rpa_data_to_file - データをファイルに保存
 *
 *	引数:
 *		di - 保存するアイテム情報
 *		file_name - ファイル名
 *		filter_index - ファイル選択時のフィルタインデックス
 *		               ファイル選択されていない場合は 0
 *		err_str - エラー文字列 (out)
 *
 *	戻り値:
 *		TRUE - 成功
 *		FALSE - 失敗 (err_str を空で返すと保存処理なし)
 */
__declspec(dllexport) BOOL CALLBACK rpa_data_to_file(DATA_INFO* di, const TCHAR* file_name, const int filter_index, TCHAR* err_str)
{
	return FALSE;
}

/*
 * rpa_file_to_data - ファイルからデータを作成
 *
 *	引数:
 *		file_name - ファイル名
 *		format_name - 形式名
 *		ret_size - データのサイズ (out)
 *		           NULLの場合あり
 *		err_str - エラー文字列 (out)
 *
 *	戻り値:
 *		読み込んだデータ
 *		NULL の場合は失敗 (err_str を空で返すと読み込み処理なし)
 */
__declspec(dllexport) HANDLE CALLBACK rpa_file_to_data(const TCHAR* file_name, const TCHAR* format_name, DWORD* ret_size, TCHAR* err_str)
{
	return NULL;
}

/*
 * rpa_free_data - データの解放
 *
 *	引数:
 *		format_name - 形式名
 *		data - 解放するデータ
 *
 *	戻り値:
 *		TRUE - 解放済み
 *		FALSE - 解放処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_free_data(const TCHAR* format_name, HANDLE data)
{
	return FALSE;
}

/*
 * rpa_free_item - アイテム情報の解放
 *
 *	plugin_param, param1, param2 に設定したメモリの解放などをしてください
 *	その他の情報を解放した場合はメンバにNULLを設定してください
 *
 *	引数:
 *		di - アイテム情報
 *
 *	戻り値:
 *		TRUE - 解放処理あり
 *		FALSE - 解放処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_free_item(DATA_INFO* di)
{
	return FALSE;
}

/*
 * rpa_get_menu_title - メニュータイトルの取得
 *
 *	引数:
 *		di - アイテム情報 (menu_title と free_title を編集)
 *
 *	戻り値:
 *		TRUE - タイトルあり
 *		FALSE - タイトルなし
 */
__declspec(dllexport) BOOL CALLBACK rpa_get_menu_title(DATA_INFO* di)
{
	BYTE* mem;

	if (lstrcmpi(di->format_name, TEXT("WorkflowXamlFormat")) == 0) {
		if (di->size == 0) {
			return TRUE;
		}
		if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
			return FALSE;
		}

		di->menu_title = mem_alloc(sizeof(TCHAR) * di->size);
		get_display_name(mem, di->size, di->menu_title);
		di->free_title = TRUE;
		GlobalUnlock(di->data);
	}
	return TRUE;
}

/*
 * rpa_get_menu_icon - メニュー用アイコンの取得
 *
 *	引数:
 *		di - アイテム情報 (menu_icon と free_icon を編集)
 *		icon_size - メニューに表示するアイコンのサイズ
 *
 *	戻り値:
 *		TRUE - アイコンあり
 *		FALSE - アイコンなし
 */
__declspec(dllexport) BOOL CALLBACK rpa_get_menu_icon(DATA_INFO* di, const int icon_size)
{
	di->menu_icon = RPA_icon;
	di->free_icon = FALSE;
	return TRUE;
}

/*
 * rpa_get_menu_bitmap - メニュー用ビットマップの取得
 *
 *	引数:
 *		di - アイテム情報 (menu_bitmap と free_bitmap を編集)
 *		width - ビットマップの横幅
 *		height - ビットマップの縦幅
 *
 *	戻り値:
 *		TRUE - ビットマップあり
 *		FALSE - ビットマップなし
 *
 *	個別にサイズを指定する場合は di->menu_bmp_width と di->menu_bmp_height に
 *	ビットマップのサイズを設定する。
 */
__declspec(dllexport) BOOL CALLBACK rpa_get_menu_bitmap(DATA_INFO* di, const int width, const int height)
{
	return FALSE;
}

/*
 * rpa_get_tooltip_text - メニュー用ツールチップテキストの取得
 *
 *	引数:
 *		di - アイテム情報
 *
 *	戻り値:
 *		ツールチップに表示するテキスト
 *		NULL の場合はツールチップを表示しない
 */
__declspec(dllexport) TCHAR* CALLBACK rpa_get_tooltip_text(DATA_INFO* di)
{
	TCHAR* ret = NULL;
	BYTE* mem;

	if (lstrcmpi(di->format_name, TEXT("WorkflowXamlFormat")) == 0) {
		if (di->size == 0) {
			return NULL;
		}
		if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
			return NULL;
		}
		ret = mem_calloc(sizeof(TCHAR) * di->size);
		get_display_name(mem, di->size, ret);
		GlobalUnlock(di->data);
	}
	return ret;
}

/*
 * rpa_window_create - データ表示ウィンドウの作成
 *
 *	引数:
 *		parent_wnd - 親ウィンドウ
 *
 *	戻り値:
 *		作成したウィンドウハンドル
 *		NULL の場合はウィンドウなし
 */
__declspec(dllexport) HWND CALLBACK rpa_window_create(const HWND parent_wnd)
{
	if (hViewWnd == NULL) {
		hViewWnd = create_RPA_view(hInst, parent_wnd, 0);
	}
	return hViewWnd;
}

/*
 * rpa_window_destroy - データ表示ウィンドウの破棄
 *
 *	引数:
 *		hWnd - データ表示ウィンドウ
 *
 *	戻り値:
 *		TRUE - 破棄処理あり
 *		FALSE - 破棄処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_window_destroy(const HWND hWnd)
{
	hViewWnd = NULL;
	return TRUE;
}

/*
 * rpa_window_show_data - データの表示
 *
 *	引数:
 *		hWnd - データ表示ウィンドウ
 *		di - 表示するアイテム情報
 *		lock - TRUE - 変更不可、FALSE - 変更可
 *
 *	戻り値:
 *		TRUE - データ表示処理あり
 *		FALSE - データ表示処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_window_show_data(const HWND hWnd, DATA_INFO* di, const BOOL lock)
{
	if (lstrcmpi(di->format_name, TEXT("WorkflowXamlFormat")) == 0) {
		if (di->size == 0) {
			return FALSE;
		}
		BYTE* mem;
		if (di->data == NULL || (mem = GlobalLock(di->data)) == NULL) {
			return FALSE;
		}
		TCHAR* ret = mem_calloc(sizeof(TCHAR) * di->size);
		get_display_name(mem, di->size, ret);
		GlobalUnlock(di->data);
		SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)ret);
		mem_free(&ret);
		return TRUE;
	}
	return FALSE;
}

/*
 * rpa_window_save_data - データの保存
 *
 *	引数:
 *		hWnd - データ表示ウィンドウ
 *		di - 保存するアイテム情報
 *
 *	戻り値:
 *		TRUE - データ保存処理あり
 *		FALSE - データ保存処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_window_save_data(const HWND hWnd, DATA_INFO* di)
{
	return FALSE;
}

/*
 * rpa_window_hide_data - データの非表示
 *
 *	引数:
 *		hWnd - データ表示ウィンドウ
 *		di - 非表示にするアイテム情報
 *
 *	戻り値:
 *		TRUE - データ非表示処理あり
 *		FALSE - データ非表示処理なし
 */
__declspec(dllexport) BOOL CALLBACK rpa_window_hide_data(const HWND hWnd, DATA_INFO* di)
{
	SendMessage(hWnd, WM_SETTEXT, 0, (LPARAM)TEXT(""));
	return TRUE;
}
/* End of source */
