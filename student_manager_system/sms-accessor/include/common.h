/**
 * @file common.h
 * @brief goyo bookrack accessor common header
 * @author yonaha
 * @date 2018/02/15
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMON_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMON_H_

#define GOYO_BOOKRACK_ACCESSOR_VERSION         "0.00.01"
#define GOYO_BOOKRACK_ACCESSOR_VERSION_NUMBER  1 //10000

#include <iostream>
#include <string>
#include <windows.h>
#include <wchar.h>
#include <codecvt>
#include <tchar.h>
#include <vector>

#include "json11.hpp"
#include <boost/property_tree/ptree.hpp>

#include "except/goyo_exception.h"
#include "util/goyo_log.h"

#pragma pack(push, 4)

namespace goyo_bookrack_accessor {

  typedef struct _SRECT {
    SHORT left;
    SHORT top;
    SHORT right;
    SHORT bottom;
  } SRECT;

#pragma pack(pop)

}


#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMON_H_
