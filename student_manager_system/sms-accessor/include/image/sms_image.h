/**
 * @file sms_image.h
 * @brief sms image object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef   SMS_ACCESSOR_INCLUDE_IMAGE_SMS_IMAGE_H_
#define   SMS_ACCESSOR_INCLUDE_IMAGE_SMS_IMAGE_H_

#include "../common.h"
#include "../accessor_command.h"
#include <opencv2/core/core.hpp>

namespace sms_accessor {

  /**
  * @brief sms source image type
  */
  enum SmsSourceImageType {
    FILE,
    STREAM,
  };

/**
 * @class SmsImage
 * @brief sms image object
 */
class SmsImage {
public:  

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(image_path) UTF-16 image path 
  */
  SmsImage(std::wstring image_path);

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(data) image data
  * @param(length) image length
  */
  SmsImage(char *data, size_t length);

  /**
  * @fn
  * ~SmsImage
  * @brief destructor
  */
  ~SmsImage();

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @throw sms_accessor::SmsException in case of error
  */
  void CreateThumbnail(std::wstring thumb_path, size_t container_width, size_t container_height);

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @param(quality) jpeg quality
  * @throw sms_accessor::SmsException in case of error
  */
  bool CreateThumbnail(std::wstring thumb_path, size_t container_width, size_t container_height, size_t quality);

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @throw sms_accessor::SmsException in case of error
  */
  cv::Mat GetImageInfo();

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) dest file path
  * @throw sms_accessor::SmsException in case of error
  */
  bool ConvertJpg(std::wstring dest_file);

  /**
  * @fn
  * SmsImage
  * @brief constructor
  * @param(thumb_path) thumbnail path
  * @param(container_width) container width
  * @param(container_height) container heght
  * @param(ratio) keep ratio image
  * @throw sms_accessor::SmsException in case of error
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
  SmsSourceImageType m_image_type;
};

}

#endif  // SMS_ACCESSOR_INCLUDE_IMAGE_SMS_IMAGE_H_
