/**
 * @file goyo_image.h
 * @brief goyo image object header
 * @author yonaha
 * @date 2018/03/31
 */

#ifndef   GOYO_BOOKRACK_ACCESSOR_INCLUDE_IMAGE_GOYO_IMAGE_H_
#define   GOYO_BOOKRACK_ACCESSOR_INCLUDE_IMAGE_GOYO_IMAGE_H_

#include "../common.h"
#include "../accessor_command.h"
#include <opencv2/core/core.hpp>

namespace goyo_bookrack_accessor {

  /**
  * @brief goyo source image type
  */
  enum GoyoSourceImageType {
    FILE,
    STREAM,
  };

/**
 * @class GoyoImage
 * @brief goyo image object
 */
class GoyoImage {
public:  

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(image_path) UTF-16 image path 
  */
  GoyoImage(std::wstring image_path);

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(data) image data
  * @param(length) image length
  */
  GoyoImage(char *data, size_t length);

  /**
  * @fn
  * ~GoyoImage
  * @brief destructor
  */
  ~GoyoImage();

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @throw goyo_bookrack_accessor::GoyoException in case of error
  */
  void CreateThumbnail(std::wstring thumb_path, size_t container_width, size_t container_height);

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @param(quality) jpeg quality
  * @throw goyo_bookrack_accessor::GoyoException in case of error
  */
  bool CreateThumbnail(std::wstring thumb_path, size_t container_width, size_t container_height, size_t quality);

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @throw goyo_bookrack_accessor::GoyoException in case of error
  */
  cv::Mat GetImageInfo();

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(thumb_path) dest file path
  * @throw goyo_bookrack_accessor::GoyoException in case of error
  */
  bool ConvertJpg(std::wstring dest_file);

  /**
  * @fn
  * GoyoImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @param(ratio) keep ratio image
  * @throw goyo_bookrack_accessor::GoyoException in case of error
  */
  bool ResizeImage(std::wstring thumb_path, size_t container_width, size_t container_height, bool ratio);

private:

  // image path
  std::wstring m_w_image_path;

  // stream data pointer
  char *m_data;

  // data length
  size_t m_data_length;

  // source image type
  GoyoSourceImageType m_image_type;
};

}

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_IMAGE_GOYO_IMAGE_H_
