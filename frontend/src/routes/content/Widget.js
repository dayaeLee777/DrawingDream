import { getCouresInfo } from "api/course";
import Widgets from "components/home/Widgets";
import TodayClassModal from "components/widgets/modals/TodayClassModal";
import { getNowPeriod } from "modules/time";
import { motion } from "framer-motion";
import { readTimeTable } from "modules/timetable";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { errorAlert } from "modules/alert";
import { logout } from "modules/user";

const Overlay = styled(motion.div)`
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  position: fixed;
  top: 0;
  left: 0;
`;

const overlay = {
  hidden: { backgroundColor: "rgba(0, 0, 0, 0)" },
  visible: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
  exit: { backgroundColor: "rgba(0, 0, 0, 0)" },
};

const Widget = () => {
  const dispatch = useDispatch();
  const { period, todayData } = useSelector((state) => state.timetable);
  const { userCode } = useSelector((state) => state.user);
  const [widgetId, setWidgetId] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [isShow, setIsShow] = useState(false);
  useEffect(() => {
    let interval;
    if (isLoading) {
      dispatch(readTimeTable()).then(() => {
        if (userCode === "A04") {
          interval = setInterval(() => {
            if (todayData && todayData.length > 0) {
              const periodCode = getNowPeriod(period);
              if (periodCode) {
                const courseId = todayData[periodCode.slice(2, 3) - 1].courseId;
                getCouresInfo(courseId)
                  .then((res) => {
                    if (res.data.onlineClassId) {
                      setIsShow(true);
                    }
                  })
                  .catch((e) => {
                    if (e.response.status === 401) {
                      errorAlert(401);
                      dispatch(logout());
                    } else {
                      errorAlert(
                        e.response.status,
                        "수업 정보를 불러오지 못했습니다."
                      );
                    }
                  });
              }
            }
          }, 2000);
        }
        setIsLoading(false);
      });
    }
    return () => window.clearInterval(interval);
  }, []);

  const onClick = () => {
    setWidgetId(null);
    setIsShow(false);
  };
  return (
    <>
      {!isLoading && (
        <>
          <Widgets widgetId={widgetId} setWidgetId={setWidgetId} />
          {isShow && (
            <Overlay
              variants={overlay}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={onClick}
            >
              <TodayClassModal layoutId={"M01"} />
            </Overlay>
          )}
        </>
      )}
    </>
  );
};

export default Widget;
