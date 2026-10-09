/*
 * CLCL
 *
 * fmt_RPA_view.h
 *
 * Copyright (C) 1996-2019 by Ohno Tomoaki. All rights reserved.
 *		https://www.nakka.com/
 *		nakka@nakka.com
 */

#ifndef _INC_FMT_RPA_VIEW_H
#define _INC_FMT_RPA_VIEW_H

/* Include Files */
#define _INC_OLE
#include <windows.h>
#undef  _INC_OLE

/* Define */

/* Struct */

/* Function Prototypes */
BOOL register_RPA_view(const HINSTANCE hInstance);
HWND create_RPA_view(const HINSTANCE hInstance, const HWND pWnd, int id);

#endif
/* End of source */
