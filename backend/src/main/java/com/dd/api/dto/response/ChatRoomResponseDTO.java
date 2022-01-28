package com.dd.api.dto.response;

import java.util.UUID;

import com.dd.common.model.BaseResponseDto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel("ChatRoomResponseDTO")
public class ChatRoomResponseDTO extends BaseResponseDto {

	@ApiModelProperty(name = "채팅방 정보 - roomId")
	UUID roomId;

	@ApiModelProperty(name = "채팅방 정보 - name")
	String name;

	public static ChatRoomResponseDTO of(Integer statusCode, String message, ChatRoomResponseDTO chatRoomResponseDTO) {
		ChatRoomResponseDTO res = chatRoomResponseDTO;
		res.setStatusCode(statusCode);
		res.setMessage(message);

		return res;
	}
}
