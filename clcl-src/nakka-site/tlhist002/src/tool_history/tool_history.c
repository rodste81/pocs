/*
 * tool_history
 *
 * tool_history.c
 *
 * Copyright (C) 1996-2003 by Nakashima Tomoaki. All rights reserved.
 *		http://www.nakka.com/
 *		nakka@nakka.com
 */

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

#include "..\CLCLPlugin.h"

#include "resource.h"

/* Define */
#define	INI_FILE_NAME				TEXT("tool_history.ini")

/* Global Variables */
HINSTANCE hInst;
TCHAR ini_path[BUF_SIZE];

int history_max;
int folder_max;
int folder_item_max;
TCHAR folder_name_format[BUF_SIZE];

/* Local Function Prototypes */
static BOOL dll_initialize(void);
static BOOL dll_uninitialize(void);

/*
 * DllMain - メイン
 */
int WINAPI DllMain(HINSTANCE hInstance, DWORD fdwReason, PVOID pvReserved)
{
	switch (fdwReason) {
	case DLL_PROCESS_ATTACH:
		hInst = hInstance;
		dll_initialize();
		break;

	case DLL_PROCESS_DETACH:
		dll_uninitialize();
		break;

	case DLL_THREAD_ATTACH:
	case DLL_THREAD_DETACH:
		break;
	}
	return TRUE;
}

/*
 * dll_initialize - 初期化
 */
static BOOL dll_initialize(void)
{
	TCHAR app_path[BUF_SIZE];
	TCHAR *p, *r;

	GetModuleFileName(hInst, app_path, BUF_SIZE - 1);
	for (p = r = app_path; *p != TEXT('\0'); p++) {
#ifndef UNICODE
		if (IsDBCSLeadByte((BYTE)*p) == TRUE) {
			p++;
			continue;
		}
#endif	// UNICODE
		if (*p == TEXT('\\') || *p == TEXT('/')) {
			r = p;
		}
	}
	*r = TEXT('\0');
	wsprintf(ini_path, TEXT("%s\\%s"), app_path, INI_FILE_NAME);

	history_max = GetPrivateProfileInt(TEXT("tree_history"), TEXT("history_max"), 10, ini_path);
	folder_max = GetPrivateProfileInt(TEXT("tree_history"), TEXT("folder_max"), 5, ini_path);
	folder_item_max = GetPrivateProfileInt(TEXT("tree_history"), TEXT("folder_item_max"), 10, ini_path);
	GetPrivateProfileString(TEXT("tree_history"), TEXT("folder_name_format"), TEXT("%1～%2"), folder_name_format, BUF_SIZE - 1, ini_path);
	return TRUE;
}

/*
 * dll_uninitialize - 終了処理
 */
static BOOL dll_uninitialize(void)
{
	return TRUE;
}

/*
 * get_tool_info_w - ツール情報取得
 */
__declspec(dllexport) BOOL CALLBACK get_tool_info_w(const HWND hWnd, const int index, TOOL_GET_INFO *tgi)
{
	switch (index) {
	case 0:
		lstrcpy(tgi->title, TEXT("履歴の階層管理"));
		lstrcpy(tgi->func_name, TEXT("tree_history"));
		lstrcpy(tgi->cmd_line, TEXT(""));
		tgi->call_type = CALLTYPE_ADD_HISTORY;
		return TRUE;
	}
	return FALSE;
}

/*
 * alloc_copy - バッファを確保して文字列をコピーする
 */
TCHAR *alloc_copy(const TCHAR *buf)
{
	TCHAR *ret;

	if (buf == NULL) {
		return NULL;
	}
	ret = (TCHAR *)LocalAlloc(LMEM_FIXED, sizeof(TCHAR) * (lstrlen(buf) + 1));
	if (ret == NULL) {
		return NULL;
	}
	lstrcpy(ret, buf);
	return ret;
}

/*
 * move_item - アイテムの移動
 */
static BOOL move_item(DATA_INFO *to_di, DATA_INFO *from_di, const int max)
{
	DATA_INFO *di;
	DATA_INFO *prev_di = NULL;
	DATA_INFO *last_di = NULL;
	DATA_INFO *last_prev_di = NULL;
	int i;

	// 移動するアイテムを検索
	i = 0;
	for (di = from_di->child; di != NULL; di = di->next) {
		if (di->type != TYPE_FOLDER) {
			last_prev_di = prev_di;
			last_di = di;
			i++;
		}
		prev_di = di;
	}
	if (i <= max || last_di == NULL) {
		// 移動なし
		return FALSE;
	}
	// アイテムの移動
	if (last_prev_di == NULL) {
		from_di->child = last_di->next;
	} else {
		last_prev_di->next = last_di->next;
	}
	last_di->next = to_di->child;
	to_di->child = last_di;
	return TRUE;
}

/*
 * create_folder_name - フォルダ名の作成
 */
static void create_folder_name(const int st, const int en, TCHAR *ret)
{
	TCHAR *p = folder_name_format;
	TCHAR tmp[BUF_SIZE];

	if (*p == TEXT('\0')) {
		wsprintf(ret, TEXT("%d - %d"), st, en);
		return;
	}
	while (*p != TEXT('\0')) {
#ifndef UNICODE
		if (IsDBCSLeadByte((BYTE)*p) == TRUE) {
			*(ret++) = *(p++);
			if (*p == TEXT('\0')) {
				break;
			}
			*(ret++) = *(p++);
			continue;
		}
#endif	// UNICODE
		if (*p != TEXT('%')) {
			*(ret++) = *(p++);
			continue;
		}

		p++;
		if (*p == TEXT('\0')) {
			break;
		}
		switch (*p) {
		case TEXT('%'):
			// %
			*(ret++) = *p;
			break;

		case TEXT('1'):
			wsprintf(tmp, TEXT("%d"), st);
			lstrcpy(ret, tmp);
			ret += lstrlen(ret);
			break;

		case TEXT('2'):
			wsprintf(tmp, TEXT("%d"), en);
			lstrcpy(ret, tmp);
			ret += lstrlen(ret);
			break;
		}
		p++;
	}
	*ret = TEXT('\0');
}

/*
 * tree_history - 履歴の階層管理
 */
__declspec(dllexport) int CALLBACK tree_history(const HWND hWnd, TOOL_EXEC_INFO *tei, TOOL_DATA_INFO *tdi)
{
	DATA_INFO *hdi;
	DATA_INFO *folder_di;
	DATA_INFO *prev_folder_di = NULL;
	DATA_INFO *prev_di = NULL;
	DATA_INFO *di;
	TCHAR buf[BUF_SIZE];
	int max = history_max;
	int i;

	if (!(tei->call_type & CALLTYPE_ADD_HISTORY)) {
		return TOOL_SUCCEED;
	}
	// 履歴リストの取得
	hdi = (DATA_INFO *)SendMessage(hWnd, WM_HISTORY_GET_ROOT, 0, 0);
	if (hdi == NULL) {
		return TOOL_SUCCEED;
	}
	folder_di = hdi->child;

	// アイテムをフォルダに移動
	for (i = 0; i < folder_max; i++) {
		// 移動先のフォルダを検索
		for (; folder_di != NULL && folder_di->type != TYPE_FOLDER; folder_di = folder_di->next) {
			prev_folder_di = folder_di;
		}
		// フォルダのタイトル作成
		create_folder_name(history_max + i * folder_item_max + 1, history_max + i * folder_item_max + folder_item_max, buf);
		if (folder_di == NULL) {
			// フォルダを作成
			folder_di = LocalAlloc(LPTR, sizeof(DATA_INFO));
			folder_di->type = TYPE_FOLDER;
			folder_di->title = alloc_copy(buf);
			if (prev_folder_di == NULL) {
				hdi->child = folder_di;
			} else {
				prev_folder_di->next = folder_di;
			}
		} else {
			LocalFree(folder_di->title);
			folder_di->title = alloc_copy(buf);
		}

		// アイテムの移動
		if (move_item(folder_di, hdi, max) == FALSE) {
			break;
		}
		while (move_item(folder_di, hdi, max) == TRUE);
		// 初期化
		hdi = folder_di;
		prev_folder_di = folder_di;
		folder_di = folder_di->next;
		max = folder_item_max;
	}
	if (hdi != (DATA_INFO *)SendMessage(hWnd, WM_HISTORY_GET_ROOT, 0, 0)) {
		// アイテムの削除
		for (i = 0, di = hdi->child; i < max && di != NULL; i++, di = di->next) {
			prev_di = di;
		}
		if (i >= max && di != NULL) {
			if (prev_di == NULL) {
				hdi->child = NULL;
			} else {
				prev_di->next = NULL;
			}
			SendMessage(hWnd, WM_ITEM_FREE, 0, (LPARAM)di);
		}
	}
	// フォルダの削除
	for (di = folder_di; di != NULL; di = di->next) {
		if (di->type == TYPE_FOLDER && di->child != NULL) {
			prev_folder_di = (di != hdi->child) ? di : NULL;
			folder_di = di->next;
		}
	}
	for (; folder_di != NULL; folder_di = folder_di->next) {
		if (folder_di->type == TYPE_FOLDER) {
			if (prev_folder_di == NULL) {
				hdi->child = folder_di->next;
			} else {
				prev_folder_di->next = folder_di->next;
			}
			folder_di->next = NULL;
			SendMessage(hWnd, WM_ITEM_FREE, 0, (LPARAM)folder_di);
			folder_di = prev_folder_di;
		} else {
			prev_folder_di = folder_di;
		}
	}
	SendMessage(hWnd, WM_HISTORY_CHANGED, 0, 0);
	return TOOL_SUCCEED;
}

/*
 * set_tree_history_proc - 設定
 */
BOOL CALLBACK set_tree_history_proc(HWND hDlg, UINT uMsg, WPARAM wParam, LPARAM lParam)
{
	TCHAR buf[BUF_SIZE];

	switch (uMsg) {
	case WM_INITDIALOG:
		SetDlgItemInt(hDlg, IDC_EDIT_HISTORY_MAX, history_max, FALSE);
		SetDlgItemInt(hDlg, IDC_EDIT_FOLDER_MAX, folder_max, FALSE);
		SetDlgItemInt(hDlg, IDC_EDIT_FOLDER_ITEM_MAX, folder_item_max, FALSE);
		SendDlgItemMessage(hDlg, IDC_EDIT_FOLDER_NAME_FORMAT, WM_SETTEXT, 0, (LPARAM)folder_name_format);
		break;

	case WM_CLOSE:
		EndDialog(hDlg, FALSE);
		break;

	case WM_COMMAND:
		switch (LOWORD(wParam)) {
		case IDOK:
			history_max = GetDlgItemInt(hDlg, IDC_EDIT_HISTORY_MAX, NULL, FALSE);
			folder_max = GetDlgItemInt(hDlg, IDC_EDIT_FOLDER_MAX, NULL, FALSE);
			folder_item_max = GetDlgItemInt(hDlg, IDC_EDIT_FOLDER_ITEM_MAX, NULL, FALSE);
			SendDlgItemMessage(hDlg, IDC_EDIT_FOLDER_NAME_FORMAT, WM_GETTEXT, BUF_SIZE - 1, (LPARAM)folder_name_format);

			wsprintf(buf, TEXT("%d"), history_max);
			WritePrivateProfileString(TEXT("tree_history"), TEXT("history_max"), buf, ini_path);
			wsprintf(buf, TEXT("%d"), folder_max);
			WritePrivateProfileString(TEXT("tree_history"), TEXT("folder_max"), buf, ini_path);
			wsprintf(buf, TEXT("%d"), folder_item_max);
			WritePrivateProfileString(TEXT("tree_history"), TEXT("folder_item_max"), buf, ini_path);
			WritePrivateProfileString(TEXT("tree_history"), TEXT("folder_name_format"), folder_name_format, ini_path);
			EndDialog(hDlg, TRUE);
			break;

		case IDCANCEL:
			EndDialog(hDlg, FALSE);
			break;
		}
		break;

	default:
		return FALSE;
	}
	return TRUE;
}

/*
 * tree_history_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK tree_history_property(const HWND hWnd, TOOL_EXEC_INFO *tei)
{
	DialogBoxParam(hInst, MAKEINTRESOURCE(IDD_DIALOG_TREE_HISTORY), hWnd, set_tree_history_proc, 0);
	return TRUE;
}
/* End of source */
