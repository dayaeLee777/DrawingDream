import commonCode from "config/commonCode";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import kurentoUtils from "kurento-utils";
import styled from "styled-components";
import Chat from "components/onlineclass/Chat";
import { getCouresInfo } from "api/course";
import Button from "components/commons/button";
import { deleteOnlineClass } from "api/onlineclass";
import {
  faVideoSlash,
  faVideo,
  faMicrophone,
  faMicrophoneSlash,
  faExternalLinkAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const Container = styled.div`
  margin: 1rem 10vw;
`;

const Header = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const Title = styled.div`
  font-size: 2rem;
  font-weight: 600;
  margin: 2rem;
  letter-spacing: -1px;
`;

const ControlContainer = styled.div`
  display: flex;
  width: 40rem;
  justify-content: center;
  margin-left: 5rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #fec25c;
  padding: 1rem;
  border-radius: 20px;
  margin: 1rem;
`;

const ButtonName = styled.div`
  cursor: pointer;
  margin-left: 0.5rem;
  display: flex;

  justify-content: center;
  align-items: center;
`;
const TeacherVideoContainer = styled.div`
  width: 60vw;
  video::-webkit-media-controls-timeline {
    display: none;
  }
`;
const Wrapper = styled.div`
  display: flex;
  width: 100%;
  height: 65vh;
`;

const ParticipantVideoContainer = styled.div`
  width: 12vw;
  height: 15vh;
  display: flex;
  margin-top: 2rem;
`;

const OnlineClass = () => {
  const roomId = useParams().roomid;
  let ws = new WebSocket("wss://i6a607.p.ssafy.io:8443/groupcall");
  let participants = {};
  let room = roomId;
  const { userName, userCode } = useSelector((state) => state.user);

  const [courseInfo, setCourseInfo] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  let name = userName;

  useEffect(() => {
    if (isLoading) {
      getCouresInfo(roomId).then((res) => {
        setCourseInfo(res.data);
        setIsLoading(false);
      });
    }
  }, []);

  /**
   * Creates a video element for a new participant
   *
   * @param {String} name - the name of the new participant, to be used as tag
   *                        name of the video element.
   *                        The tag of the new element will be 'video<name>'
   * @return
   */
  class Participant {
    constructor(name) {
      this.name = name;
      var rtcPeer;

      let video;
      if (name === courseInfo.teacherName || name.includes("screen")) {
        video = document.createElement("video");
        video.id = "video-" + name;
        video.autoplay = true;
        video.controls = false;
        video.style.borderRadius = "10px";
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        document.getElementById("teacher").appendChild(video);
      } else {
        video = document.createElement("video");
        video.id = "video-" + name;
        video.autoplay = true;
        video.controls = false;
        video.style.width = "100%";
        video.style.height = "100%";
        video.style.objectFit = "cover";
        video.style.borderRadius = "10px";
        document.getElementById("participants").appendChild(video);
      }

      this.getVideoElement = function () {
        return video;
      };

      this.offerToReceiveVideo = function (error, offerSdp, wp) {
        if (error) return console.error("sdp offer error");
        console.log("Invoking SDP offer callback function");
        var msg = {
          id: "receiveVideoFrom",
          sender: name,
          sdpOffer: offerSdp,
        };
        sendMessage(msg);
      };

      this.onIceCandidate = function (candidate, wp) {
        console.log("Local candidate" + JSON.stringify(candidate));

        var message = {
          id: "onIceCandidate",
          candidate: candidate,
          name: name,
        };
        sendMessage(message);
      };

      // Object.defineProperty(this, "rtcPeer", { writable: true });

      this.dispose = function () {
        console.log("Disposing participant " + this.name);
        this.rtcPeer.dispose();
        // container.parentNode.removeChild(container);
      };
    }
  }
  if (!isLoading) {
    ws.onmessage = function (message) {
      var parsedMessage = JSON.parse(message.data);
      console.info("Received message: " + message.data);

      switch (parsedMessage.id) {
        case "existingParticipants":
          onExistingParticipants(parsedMessage);
          break;
        case "newParticipantArrived":
          onNewParticipant(parsedMessage);
          break;
        case "participantLeft":
          onParticipantLeft(parsedMessage);
          break;
        case "receiveVideoAnswer":
          receiveVideoResponse(parsedMessage);
          break;
        case "iceCandidate":
          participants[parsedMessage.name].rtcPeer.addIceCandidate(
            parsedMessage.candidate,
            function (error) {
              if (error) {
                console.error("Error adding candidate: " + error);
                return;
              }
            }
          );
          break;
        default:
          console.error("Unrecognized message", parsedMessage);
      }
    };

    ws.onopen = () => {
      const message = {
        id: "joinRoom",
        name: userName,
        room: roomId,
      };
      ws.send(JSON.stringify(message));
    };
  }
  function onNewParticipant(request) {
    receiveVideo(request.name);
  }

  function receiveVideoResponse(result) {
    participants[result.name].rtcPeer.processAnswer(
      result.sdpAnswer,
      function (error) {
        if (error) return console.error(error);
      }
    );
  }

  function onExistingParticipants(msg) {
    var constraints = {
      audio: true,
      video: {
        mandatory: {
          maxWidth: 320,
          maxFrameRate: 15,
          minFrameRate: 15,
        },
      },
    };
    if (name.includes("screen")) {
      console.log("#########" + name);
      var participant = new Participant(name);
      participants[name] = participant;
      var video = participant.getVideoElement();
      if (navigator.getDisplayMedia || navigator.mediaDevices.getDisplayMedia) {
        if (navigator.mediaDevices.getDisplayMedia) {
          navigator.mediaDevices
            .getDisplayMedia({ video: true, audio: true })
            .then((stream) => {
              video.srcObject = stream;
              options = {
                videoStream: stream,
                mediaConstraints: constraints,
                sendSource: "screen",
                onicecandidate: participant.onIceCandidate.bind(participant),
              };
              participant.rtcPeer =
                new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(
                  options,
                  function (error) {
                    if (error) {
                      return console.error(error);
                    }
                    this.generateOffer(
                      participant.offerToReceiveVideo.bind(participant)
                    );
                  }
                );
              msg.data.forEach(receiveVideo);
            });
        }
      }
    } else {
      console.log(name + " registered in room " + room);
      var participant = new Participant(name);
      participants[name] = participant;
      var video = participant.getVideoElement();
      console.log(video);
      var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: participant.onIceCandidate.bind(participant),
      };
      participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(
        options,
        function (error) {
          if (error) {
            return console.error(error);
          }
          this.generateOffer(participant.offerToReceiveVideo.bind(participant));
        }
      );

      msg.data.forEach(receiveVideo);
    }
  }

  function leaveRoom() {
    sendMessage({
      id: "leaveRoom",
    });
    for (var key in participants) {
      participants[key].dispose();
    }
    navigate("/home");
    ws.close();
  }

  function receiveVideo(sender) {
    var participant = new Participant(sender);
    participants[sender] = participant;
    var video = participant.getVideoElement();
    console.log(video);
    var options = {
      remoteVideo: video,
      onicecandidate: participant.onIceCandidate.bind(participant),
    };

    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(
      options,
      function (error) {
        if (error) {
          return console.error(error);
        }
        this.generateOffer(participant.offerToReceiveVideo.bind(participant));
      }
    );
  }

  function onParticipantLeft(request) {
    console.log("Participant " + request.name + " left");
    document.getElementById("video-" + request.name).remove();
    var participant = participants[request.name];
    participant.dispose();
    delete participants[request.name];
  }

  function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    console.log("Sending message: " + jsonMessage);
    ws.send(jsonMessage);
  }

  const deleteRoom = () => {
    deleteOnlineClass(roomId).then((res) => {
      console.log(res);
    });

    leaveRoom();
  };

  const vidOnOff = () => {
    if (participants[userName].rtcPeer.videoEnabled) {
      // 끌때
      participants[userName].rtcPeer.videoEnabled = false;
      document.getElementById("vidOn").style.display = "none";
      document.getElementById("vidOff").style.display = "";
    } else {
      participants[userName].rtcPeer.videoEnabled = true;
      document.getElementById("vidOn").style.display = "";
      document.getElementById("vidOff").style.display = "none";
    }
  };
  const audOnOff = () => {
    if (participants[userName].rtcPeer.audioEnabled) {
      participants[userName].rtcPeer.audioEnabled = false;
      document.getElementById("audOn").style.display = "none";
      document.getElementById("audOff").style.display = "";
    } else {
      participants[userName].rtcPeer.audioEnabled = true;
      document.getElementById("audOn").style.display = "";
      document.getElementById("audOff").style.display = "none";
    }
  };
  const shareScreen = () => {
    if (name === userName) {
      console.log("####shareScreen" + name);
      sendMessage({
        id: "leaveRoom",
      });
      for (var key in participants) {
        if (participants[key].name !== name) {
          var partVideo = document.getElementById(
            "video-" + participants[key].name
          );
          console.log(participants[key].name);
          document.getElementById("participants").removeChild(partVideo);
        }
      }
      delete participants[name];
      document.getElementById("video-" + name).remove();

      const message = {
        id: "shareScreen",
        name: userName,
        room: roomId,
      };
      ws.send(JSON.stringify(message));
      name = "screen" + name;
      document.getElementById("shareScreenOn").style.display = "none";
      document.getElementById("shareScreenOff").style.display = "";
    } else {
      sendMessage({
        id: "leaveRoom",
      });
      for (var key in participants) {
        participants[key].dispose();
        if (participants[key].name !== name) {
          var partVideo = document.getElementById(
            "video-" + participants[key].name
          );
          console.log(participants[key].name);
          document.getElementById("participants").removeChild(partVideo);
        }
      }
      delete participants[name];
      document.getElementById("video-" + name).remove();
      const message = {
        id: "joinRoom",
        name: userName,
        room: roomId,
      };
      ws.send(JSON.stringify(message));
      name = userName;
      document.getElementById("shareScreenOn").style.display = "";
      document.getElementById("shareScreenOff").style.display = "none";
    }
  };
  return (
    <>
      <Container>
        <Header>
          {courseInfo && (
            <Title>
              {
                commonCode[courseInfo.subjectCode.substr(0, 1)][
                  courseInfo.subjectCode.substr(0, 3)
                ][courseInfo.subjectCode]
              }
              : {courseInfo.teacherName} 선생님
            </Title>
          )}
          <ControlContainer>
            <ButtonContainer
              id="vidOff"
              onClick={vidOnOff}
              style={{ display: "none" }}
            >
              <FontAwesomeIcon icon={faVideoSlash} size="sm" />
              <ButtonName>비디오 시작</ButtonName>
            </ButtonContainer>
            <ButtonContainer onClick={vidOnOff} id="vidOn">
              <FontAwesomeIcon icon={faVideo} size="sm" />
              <ButtonName>비디오 중지</ButtonName>
            </ButtonContainer>
            <ButtonContainer
              id="audOff"
              onClick={audOnOff}
              style={{ display: "none" }}
            >
              <FontAwesomeIcon icon={faMicrophoneSlash} size="sm" />
              <ButtonName>오디오 시작</ButtonName>
            </ButtonContainer>
            <ButtonContainer onClick={audOnOff} id="audOn">
              <FontAwesomeIcon icon={faMicrophone} size="sm" />
              <ButtonName>오디오 중지</ButtonName>
            </ButtonContainer>
            <ButtonContainer onClick={shareScreen} id="shareScreenOn">
              <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" />
              <ButtonName>화면 공유</ButtonName>
            </ButtonContainer>
            <ButtonContainer
              onClick={shareScreen}
              id="shareScreenOff"
              style={{ display: "none" }}
            >
              <FontAwesomeIcon icon={faTimes} />
              <ButtonName>공유 중지</ButtonName>
            </ButtonContainer>
          </ControlContainer>
          {userCode === "A03" ? (
            <Button
              onClick={deleteRoom}
              height="3rem"
              name="수업 종료하기"
            ></Button>
          ) : (
            <Button
              height="3rem"
              name="수업 나가기"
              onClick={leaveRoom}
            ></Button>
          )}
        </Header>
        <Wrapper>
          <TeacherVideoContainer id="teacher"></TeacherVideoContainer>
          <Chat courseId={roomId} />
        </Wrapper>
        <ParticipantVideoContainer id="participants"></ParticipantVideoContainer>
      </Container>
    </>
  );
};

export default OnlineClass;
