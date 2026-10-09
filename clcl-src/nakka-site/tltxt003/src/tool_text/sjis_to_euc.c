/*
 * tool_text
 *
 * sjis_to_euc.c
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
#define	IsKanji(c)				(((unsigned char)c >= (unsigned char)0x81 && (unsigned char)c <= (unsigned char)0x9F) || \
									((unsigned char)c >= (unsigned char)0xE0 && (unsigned char)c <= (unsigned char)0xFC))

/* Global Variables */

/* Local Function Prototypes */

/*
 * sjis_euc - SJISをEUCに変換する
 */
static char *sjis_euc(char *buf, char *ret)
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
		if (IsKanji((unsigned char)c) == TRUE) {
			c -= (c <= 0x9F) ? 0x71 : 0xB1;
			c = (c << 1) + 1;
			if (d >= 0x9E) {
				d -= 0x7E;
				c++;
			} else if (d > 0x7F) {
				d -= 0x20;
			} else {
				d -= 0x1F;
			}
			c |= 0x80;
			d |= 0x80;
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
 * item_sjis_to_euc - SJISをEUCに変換
 */
static int item_sjis_to_euc(DATA_INFO *di)
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

	// EUCに変換
	sjis_euc(from_mem, to_mem);
	di->size = strlen(to_mem) + 1;

	GlobalUnlock(ret);
	GlobalUnlock(di->data);

	GlobalFree(di->data);
	di->data = ret;
	return TOOL_DATA_MODIFIED;
}

/*
 * sjis_to_euc - SJISをEUCに変換
 */
__declspec(dllexport) int CALLBACK sjis_to_euc(const HWND hWnd, TOOL_EXEC_INFO *tei, TOOL_DATA_INFO *tdi)
{
	DATA_INFO *di;
	int ret = TOOL_SUCCEED;

	for (; tdi != NULL; tdi = tdi->next) {
		di = (DATA_INFO *)SendMessage(hWnd, WM_ITEM_GET_FORMAT_TO_ITEM, (WPARAM)TEXT("TEXT"), (LPARAM)tdi->di);
		if (di != NULL && di->data != NULL) {
			ret |= item_sjis_to_euc(di);
		}
	}
	return ret;
}

/*
 * sjis_to_euc_property - プロパティ表示
 */
__declspec(dllexport) BOOL CALLBACK sjis_to_euc_property(const HWND hWnd, TOOL_EXEC_INFO *tei)
{
	return FALSE;
}
/* End of source */
