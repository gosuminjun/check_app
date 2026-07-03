
import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  getDocs,
} from "firebase/firestore";

function App() {
  // 사람 리스트 관리
  const initialPeople = useMemo(
    () => [
      { id: 1, name: "오세진", willEat: false, onTrip: false },
      { id: 2, name: "이철호", willEat: false, onTrip: false },
      { id: 3, name: "박문권", willEat: false, onTrip: false },
      { id: 4, name: "손길상", willEat: false, onTrip: false },
      { id: 5, name: "이은미", willEat: false, onTrip: false },
      { id: 6, name: "이경연", willEat: false, onTrip: false },
      { id: 7, name: "김서훈", willEat: false, onTrip: false },
      { id: 8, name: "이고은", willEat: false, onTrip: false },
      { id: 9, name: "전우현", willEat: false, onTrip: false },
      { id: 10, name: "오민준", willEat: false, onTrip: false },
      { id: 11, name: "이정원", willEat: false, onTrip: false },
      { id: 12, name: "심민호", willEat: false, onTrip: false },
    ],
    []
  );

  const [people, setPeople] = useState([]);

  useEffect(() => {
  const colRef = collection(db, "people");

  const unsub = onSnapshot(colRef, async (snap) => {
    // ✅ 처음 1번: DB에 사람이 12명 다 없으면 initialPeople로 채움
    if (snap.size < initialPeople.length) {
      // 현재 DB에 있는 id 목록
      const existingIds = new Set(snap.docs.map((d) => Number(d.id)));

      const missing = initialPeople.filter((p) => !existingIds.has(p.id));

      await Promise.all(
        missing.map((p) => setDoc(doc(colRef, String(p.id)), p, { merge: true }))
      );
    }

    // ✅ 실시간 반영
    const list = snap.docs
      .map((d) => d.data())
      .sort((a, b) => a.id - b.id);

    setPeople(list);
  });

  return () => unsub();
  }, [initialPeople]);



  // 오늘 날짜
  const formattedDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 식사 대상(출장 아닌 사람)만
  const mealPeople = useMemo(() => people.filter((p) => !p.onTrip), [people]);
  const tripPeople = useMemo(() => people.filter((p) => p.onTrip), [people]);

  
  // 먹겠다 토글 (출장자는 토글할 필요 없음)
  const toggleWillEat = async (id, currentWillEat) => {
    await updateDoc(doc(db, "people", String(id)), {
    willEat: !currentWillEat,
  });
};

  // 출장 시 식사 여부는 false로 변경
  const goTrip = async (id) => {
  await updateDoc(doc(db, "people", String(id)), {
    onTrip: true,
    willEat: false,
    });
  };


  // 출장 복귀 시 다시 식사 리스트로 이동
  const returnFromTrip = async (id) => {
  await updateDoc(doc(db, "people", String(id)), {
      onTrip: false,
    });
  };

  // 식사 대상을 기준으로 먹겠다 전체 초기화
  const resetAllWillEat = async () => {
  await Promise.all(
    people
      .filter((p) => !p.onTrip)
      .map((p) =>
        updateDoc(doc(db, "people", String(p.id)), { willEat: false })
      )
  );
};

  // 식사 인원 체크
  const willEatCount = useMemo(
    () => mealPeople.filter((p) => p.willEat).length,
    [mealPeople]
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>오늘 먹을 사람 체크</h1>
      <h1 style={{ fontSize: 6, opacity: 0.5,marginBottom: 6 }}>빌드 v3</h1>
      <div style={{ opacity: 0.7, marginBottom: 18 }}>{formattedDate}</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <button onClick={resetAllWillEat}>먹겠다 전체 초기화</button>
        <span style={{ opacity: 0.7 }}>출장자는 식사 인원 계산에서 제외됨</span>
      </div>

      {/* ✅ 원래 리스트(식사 대상) */}
      <section style={{ marginBottom: 22 }}>
        <h2 style={{ margin: "14px 0 10px" }}>식사 대상 리스트</h2>

        {mealPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>현재 식사 대상자가 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {mealPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                  gap: 12,
                }}
              >
                {/* 왼쪽: 출장 버튼 + 이름/상태 */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong>{p.name}</strong>
                    <span style={{ fontSize: 14, opacity: 0.75 }}>
                      {p.willEat ? "먹어요 ✅" : "안먹어요 ❌"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => goTrip(p.id)}>출장</button>
                  <button onClick={() => toggleWillEat(p.id, p.willEat)}>
                    {p.willEat ? "안먹어요" : "먹어요"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ✅ 식사 인원 문구 */}
      <div style={{ marginTop: 10, fontSize: 16 }}>
        {formattedDate} 식사 인원은 <strong>{willEatCount}</strong>명 입니다.
      </div>

      {/* ✅ 출장 인원 리스트 */}
      <section style={{ marginTop: 26 }}>
        <h2 style={{ margin: "14px 0 10px" }}>출장 간 인원</h2>

        {tripPeople.length === 0 ? (
          <div style={{ opacity: 0.7 }}>출장 중인 인원이 없습니다.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tripPeople.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  marginBottom: 10,
                }}
              >
                <strong>{p.name}</strong>
                <button onClick={() => returnFromTrip(p.id)}>출장 복귀</button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: 10, opacity: 0.7, fontSize: 14 }}>
          출장 인원은 먹겠다/안먹겠다를 고려하지 않습니다.
        </div>
      </section>
    </div>
  );
}

export default App;
