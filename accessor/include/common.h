/**
 * @file common.h
 * @brief accessor common header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_COMMON_H_
#define ACCESSOR_INCLUDE_COMMON_H_

#define ACCESSOR_VERSION         "0.00.01"
#define ACCESSOR_VERSION_NUMBER  1  // 10000

#include <iostream>
#include <sstream>
#include <string>
#include <windows.h>
#include <wchar.h>
#include <codecvt>
#include <tchar.h>
#include <vector>

#include "json11.hpp"

#include "except/sms_exception.h"
#include "util/sms_log.h"

#pragma pack(push, 4)

namespace accessor {

  typedef struct _SRECT {
    SHORT left;
    SHORT top;
    SHORT right;
    SHORT bottom;
  } SRECT;

#pragma pack(pop)
}

#endif  // ACCESSOR_INCLUDE_COMMON_H_
