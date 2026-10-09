/*
 * tool_text
 *
 * euc_to_sjis.c
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

/* Define */

/* Global Variables */

/* Local Function Prototypes */

/*
 * SjisShift - JISの2バイトをSJISに変換
 */
static void SjisShift(int *ph, int *pl)
{
	if (*ph & 1) {
		if (*pl < 0x60) {
			*pl+=0x1F;
		} else {
			*pl+=0x20;
		}
	} else {
		*pl+=0x7E;
	}
	if (*ph < 0x5F) {
		*ph = (*ph + 0xE1) >> 1;
	} else {
		*ph = (*ph + 0x161) >> 1;
	}
}

/*
 * euc_sjis - EUCをSJISに変換する
 */
static char *euc_sjis(char *buf, char *ret)
{
	char *p, *r;
	unsigned int c, d;

	p = buf;
	r = ret;
	while (*p != '\0') {
		c = *(p++) & 0xFF;
		if (*p == '\0') {
			break;
		}
		d = *p & 0xFF;
		if ((c >= 0xa1 && c <= 0xfe) && (d >= 0xa1 && d <= 0xfe)) {
			// EUCをJISに変換
			c &= ~0x80;
			d &= ~0x80;

			// JISをSJISに変換
			SjisShift((int *)&c, (int *)&d);

			*(r++) = (char)c;
			*(r++) = (char)d;
			p++;
		} else {
			*(r++) = (char)c;
		}
	}
	*r = '\0';
	return r;
}

/*
 * item_euc_to_sjis - EUCをSJISに変換
 */
static int item_euc_to_sjis(DATA_INFO *di)
{
	HANDLE ret;
	BYTE *from_mem, *to_mem;

	// メモリのロック
	if ((from_mem = GlobalLock(di->data)) == NULL) {
		return TOOL_ERROR;
	}

	// コピー先確保
	if ((ret = GlobalAlloc(GHND, di->size * 4 + 1)) == NULL) {
		GlobalUnlock(di->data);
		return TOOL_ERROR;
	}
	// コピー先ロック
	if ((to_mem = GlobalLock(ret)) == NULL) {
		GlobalFree(ret);
		GlobalUnlock(di->data);
		return TOOL_ERROR;
	}

	// SJISに変換
	euc_sjis(from_mem, to_mem);
	di->size = strlen(to_mem) + 1;

	GlobalUnlock(ret);
	GlobalUnlock(di->data);

	GlobalFree(di->data);
	di->data = ret;
	return TOOL_DATA_MODIFIED;
}

/*
 * euc_to_sjis - EUCをSJISに変換
 */
__declspec(dllexport) int CALLBACK euc_to_sjis(const HWND hWnd, TOOL_EXEC_INFO *tei, TOOL_DATA_INFO *tdi)
{
	DATA_INFO *di;
	int ret = TOOL_SUCCEED;

	for (; tdi != NULL; tdi = tdi->next) {
		di = (DATA_INFO *)SendMessage(hWnd, WM_ITEM_GET_FORMAT_TO_ITEM, (WPARAM)TEXT("TEXT"), (LPARAM)tdi->di);
		if (di != NULL && di->data != NULL) {
			ret |= item_euc_to_sjis(di);
		}
	}
	return ret;
}

/*
 * euc_to_sjis_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK euc_to_sjis_property(const HWND hWnd, TOOL_EXEC_INFO *tei)
{
	return FALSE;
}
/* End of source */
